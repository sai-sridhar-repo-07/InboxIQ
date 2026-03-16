"""
HubSpot CRM integration — push contacts and email notes via Private App token.
Docs: https://developers.hubspot.com/docs/api/crm/contacts
"""
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

HS_BASE = "https://api.hubapi.com"


def _headers(api_key: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


async def test_connection(api_key: str) -> bool:
    """Verify that the API key is valid by calling the /crm/v3/owners endpoint."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{HS_BASE}/crm/v3/owners", headers=_headers(api_key))
        return resp.status_code == 200
    except Exception as exc:
        logger.warning("HubSpot test_connection failed: %s", exc)
        return False


async def upsert_contact(api_key: str, email: str, first_name: str = "", last_name: str = "") -> Optional[str]:
    """
    Create or update a HubSpot contact by email. Returns the contact ID.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Search for existing contact
            search_resp = await client.post(
                f"{HS_BASE}/crm/v3/objects/contacts/search",
                headers=_headers(api_key),
                json={
                    "filterGroups": [{"filters": [{"propertyName": "email", "operator": "EQ", "value": email}]}],
                    "properties": ["email", "firstname", "lastname"],
                    "limit": 1,
                },
            )
            if search_resp.status_code == 200:
                results = search_resp.json().get("results", [])
                if results:
                    return results[0]["id"]

            # Create new contact
            props: dict = {"email": email}
            if first_name:
                props["firstname"] = first_name
            if last_name:
                props["lastname"] = last_name

            create_resp = await client.post(
                f"{HS_BASE}/crm/v3/objects/contacts",
                headers=_headers(api_key),
                json={"properties": props},
            )
            if create_resp.status_code in (200, 201):
                return create_resp.json()["id"]
    except Exception as exc:
        logger.warning("HubSpot upsert_contact failed: %s", exc)
    return None


async def create_note(api_key: str, contact_id: str, subject: str, body: str) -> bool:
    """Create a note in HubSpot and associate it with the given contact."""
    try:
        note_body = f"*{subject}*\n\n{body}"[:65000]
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{HS_BASE}/crm/v3/objects/notes",
                headers=_headers(api_key),
                json={
                    "properties": {"hs_note_body": note_body},
                    "associations": [
                        {
                            "to": {"id": contact_id},
                            "types": [{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 202}],
                        }
                    ],
                },
            )
        return resp.status_code in (200, 201)
    except Exception as exc:
        logger.warning("HubSpot create_note failed: %s", exc)
        return False


async def sync_email_to_hubspot(api_key: str, sender_email: str, sender_name: str, subject: str, summary: str) -> None:
    """
    Full sync: upsert contact then attach a note with the email summary.
    """
    parts = sender_name.strip().split(" ", 1)
    first = parts[0] if parts else ""
    last = parts[1] if len(parts) > 1 else ""

    contact_id = await upsert_contact(api_key, sender_email, first, last)
    if contact_id:
        await create_note(api_key, contact_id, subject, summary or "Email received via InboxIQ.")
        logger.info("HubSpot: synced email from %s (contact=%s)", sender_email, contact_id)
    else:
        logger.warning("HubSpot: could not upsert contact for %s", sender_email)
