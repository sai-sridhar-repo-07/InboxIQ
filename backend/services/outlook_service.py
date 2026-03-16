"""
Microsoft Outlook / Graph API integration service.
Handles OAuth token exchange, token refresh, and email fetching.
"""
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx

from config import settings
from database import get_supabase

logger = logging.getLogger(__name__)

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0"
SCOPES = "Mail.Read Mail.Send offline_access User.Read"


def get_auth_url(state: str = "") -> str:
    params = {
        "client_id": settings.MS_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": settings.MS_REDIRECT_URI,
        "scope": SCOPES,
        "response_mode": "query",
        "state": state,
    }
    return f"{AUTH_BASE}/authorize?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    """Exchange auth code for access + refresh tokens."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AUTH_BASE}/token",
            data={
                "client_id": settings.MS_CLIENT_ID,
                "client_secret": settings.MS_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.MS_REDIRECT_URI,
                "grant_type": "authorization_code",
                "scope": SCOPES,
            },
        )
        resp.raise_for_status()
        return resp.json()


async def refresh_token(user_id: str, refresh_tok: str) -> dict:
    """Refresh an expired access token and persist it."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{AUTH_BASE}/token",
            data={
                "client_id": settings.MS_CLIENT_ID,
                "client_secret": settings.MS_CLIENT_SECRET,
                "refresh_token": refresh_tok,
                "grant_type": "refresh_token",
                "scope": SCOPES,
            },
        )
        resp.raise_for_status()
        tokens = resp.json()

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))
    supabase = get_supabase()
    supabase.table("user_profiles").update({
        "ms_access_token": tokens["access_token"],
        "ms_refresh_token": tokens.get("refresh_token", refresh_tok),
        "ms_token_expires_at": expires_at.isoformat(),
    }).eq("id", user_id).execute()
    return tokens


async def _get_valid_token(user_id: str) -> str:
    """Return a valid access token, refreshing if needed."""
    supabase = get_supabase()
    row = supabase.table("user_profiles").select(
        "ms_access_token, ms_refresh_token, ms_token_expires_at"
    ).eq("id", user_id).single().execute()
    data = row.data or {}

    access_token = data.get("ms_access_token")
    refresh_tok = data.get("ms_refresh_token")
    expires_raw = data.get("ms_token_expires_at")

    if not access_token:
        raise ValueError("Outlook not connected")

    if expires_raw:
        try:
            expires_at = datetime.fromisoformat(expires_raw.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) >= expires_at - timedelta(minutes=5):
                tokens = await refresh_token(user_id, refresh_tok)
                access_token = tokens["access_token"]
        except Exception as exc:
            logger.warning("Token refresh check failed: %s", exc)

    return access_token


async def get_outlook_profile(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GRAPH_BASE}/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        return resp.json()


async def fetch_outlook_emails(user_id: str, max_results: int = 50) -> list[dict]:
    """Fetch recent Outlook inbox emails via Graph API."""
    access_token = await _get_valid_token(user_id)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GRAPH_BASE}/me/mailFolders/inbox/messages",
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "$top": max_results,
                "$select": "id,subject,from,toRecipients,receivedDateTime,bodyPreview,body,isRead,conversationId",
                "$orderby": "receivedDateTime desc",
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("value", [])


async def sync_outlook_emails(user_id: str) -> int:
    """Sync Outlook emails into the emails table."""
    emails = await fetch_outlook_emails(user_id, max_results=50)
    supabase = get_supabase()
    synced = 0

    for msg in emails:
        msg_id = msg.get("id", "")
        # Check for duplicate
        existing = supabase.table("emails").select("id").eq("user_id", user_id).eq("gmail_message_id", msg_id).execute()
        if existing.data:
            continue

        sender_obj = msg.get("from", {}).get("emailAddress", {})
        body_content = msg.get("body", {}).get("content", "") or msg.get("bodyPreview", "")
        received = msg.get("receivedDateTime", "")

        supabase.table("emails").insert({
            "user_id": user_id,
            "gmail_message_id": msg_id,  # reuse field for Outlook msg ID
            "gmail_thread_id": msg.get("conversationId", msg_id),
            "subject": msg.get("subject", "(no subject)"),
            "sender": sender_obj.get("address", ""),
            "from_name": sender_obj.get("name", ""),
            "from_email": sender_obj.get("address", ""),
            "body": body_content,
            "snippet": msg.get("bodyPreview", "")[:200],
            "received_at": received,
            "is_read": msg.get("isRead", False),
            "processed": False,
            "source": "outlook",
        }).execute()
        synced += 1

    return synced
