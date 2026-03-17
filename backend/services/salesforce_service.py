"""
Salesforce CRM integration — push contacts and tasks via the REST API
using the OAuth2 Resource Owner Password Credentials (ROPC) grant.

Users need:
  - A Connected App (consumer key + secret)
  - Their Salesforce username + password + security token
"""
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

SF_AUTH_URL = "https://login.salesforce.com/services/oauth2/token"
SF_API_VERSION = "v57.0"


async def _get_access_token(
    consumer_key: str,
    consumer_secret: str,
    username: str,
    password: str,
    security_token: str,
) -> tuple[Optional[str], Optional[str]]:
    """
    Authenticate via ROPC grant. Returns (access_token, instance_url).
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                SF_AUTH_URL,
                data={
                    "grant_type": "password",
                    "client_id": consumer_key,
                    "client_secret": consumer_secret,
                    "username": username,
                    "password": password + security_token,
                },
            )
        if resp.status_code == 200:
            data = resp.json()
            return data["access_token"], data["instance_url"]
        logger.warning("Salesforce auth failed: %s %s", resp.status_code, resp.text[:200])
    except Exception as exc:
        logger.warning("Salesforce _get_access_token error: %s", exc)
    return None, None


async def test_connection(
    consumer_key: str,
    consumer_secret: str,
    username: str,
    password: str,
    security_token: str,
) -> bool:
    """Verify credentials by attempting OAuth token fetch."""
    token, _ = await _get_access_token(consumer_key, consumer_secret, username, password, security_token)
    return token is not None


async def _upsert_contact(
    access_token: str,
    instance_url: str,
    email: str,
    first_name: str,
    last_name: str,
) -> Optional[str]:
    """
    Query for an existing Contact by email; create one if not found.
    Returns the Salesforce Contact Id.
    """
    base = f"{instance_url}/services/data/{SF_API_VERSION}"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # SOQL query
            query = f"SELECT Id FROM Contact WHERE Email = '{email}' LIMIT 1"
            qresp = await client.get(f"{base}/query", params={"q": query}, headers=headers)
            if qresp.status_code == 200:
                records = qresp.json().get("records", [])
                if records:
                    return records[0]["Id"]

            # Create
            payload: dict = {"Email": email, "LastName": last_name or email.split("@")[0]}
            if first_name:
                payload["FirstName"] = first_name
            cresp = await client.post(f"{base}/sobjects/Contact/", json=payload, headers=headers)
            if cresp.status_code == 201:
                return cresp.json().get("id")
    except Exception as exc:
        logger.warning("Salesforce _upsert_contact error: %s", exc)
    return None


async def _create_task(
    access_token: str,
    instance_url: str,
    who_id: str,
    subject: str,
    description: str,
) -> bool:
    """Create a Task in Salesforce linked to a Contact."""
    base = f"{instance_url}/services/data/{SF_API_VERSION}"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{base}/sobjects/Task/",
                json={
                    "WhoId": who_id,
                    "Subject": subject[:255],
                    "Description": description[:32000],
                    "Status": "Completed",
                    "ActivityDate": None,
                },
                headers=headers,
            )
        return resp.status_code == 201
    except Exception as exc:
        logger.warning("Salesforce _create_task error: %s", exc)
        return False


async def sync_email_to_salesforce(
    consumer_key: str,
    consumer_secret: str,
    username: str,
    password: str,
    security_token: str,
    sender_email: str,
    sender_name: str,
    subject: str,
    summary: str,
) -> None:
    """
    Full sync: authenticate → upsert Contact → create Task with email summary.
    """
    access_token, instance_url = await _get_access_token(
        consumer_key, consumer_secret, username, password, security_token
    )
    if not access_token or not instance_url:
        logger.warning("Salesforce: could not authenticate, skipping sync for %s", sender_email)
        return

    parts = sender_name.strip().split(" ", 1)
    first = parts[0] if parts else ""
    last = parts[1] if len(parts) > 1 else ""

    contact_id = await _upsert_contact(access_token, instance_url, sender_email, first, last)
    if contact_id:
        await _create_task(access_token, instance_url, contact_id, subject, summary or "Email received via Mailair.")
        logger.info("Salesforce: synced email from %s (contact=%s)", sender_email, contact_id)
    else:
        logger.warning("Salesforce: could not upsert Contact for %s", sender_email)
