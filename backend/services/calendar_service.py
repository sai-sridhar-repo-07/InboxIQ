"""
Google Calendar integration service.
Handles OAuth token exchange, token refresh, and calendar event management.
"""
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx

from config import settings
from database import get_supabase

logger = logging.getLogger(__name__)

CALENDAR_BASE = "https://www.googleapis.com/calendar/v3"
OAUTH_BASE = "https://accounts.google.com/o/oauth2"
SCOPES = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"


def get_auth_url(state: str = "") -> str:
    params = {
        "client_id": settings.GCAL_CLIENT_ID,
        "redirect_uri": settings.GCAL_REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{OAUTH_BASE}/auth?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    """Exchange auth code for tokens."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{OAUTH_BASE}/token",
            data={
                "code": code,
                "client_id": settings.GCAL_CLIENT_ID,
                "client_secret": settings.GCAL_CLIENT_SECRET,
                "redirect_uri": settings.GCAL_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        return resp.json()


async def _get_valid_token(user_id: str) -> str:
    supabase = get_supabase()
    row = supabase.table("user_profiles").select(
        "gcal_access_token, gcal_refresh_token, gcal_token_expires_at"
    ).eq("id", user_id).single().execute()
    data = row.data or {}

    access_token = data.get("gcal_access_token")
    refresh_tok = data.get("gcal_refresh_token")
    expires_raw = data.get("gcal_token_expires_at")

    if not access_token:
        raise ValueError("Google Calendar not connected")

    if expires_raw:
        try:
            expires_at = datetime.fromisoformat(expires_raw.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) >= expires_at - timedelta(minutes=5):
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        f"{OAUTH_BASE}/token",
                        data={
                            "refresh_token": refresh_tok,
                            "client_id": settings.GCAL_CLIENT_ID,
                            "client_secret": settings.GCAL_CLIENT_SECRET,
                            "grant_type": "refresh_token",
                        },
                    )
                    resp.raise_for_status()
                    tokens = resp.json()
                    access_token = tokens["access_token"]
                    new_expires = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))
                    supabase.table("user_profiles").update({
                        "gcal_access_token": access_token,
                        "gcal_token_expires_at": new_expires.isoformat(),
                    }).eq("id", user_id).execute()
        except Exception as exc:
            logger.warning("GCal token refresh failed: %s", exc)

    return access_token


async def list_upcoming_events(user_id: str, max_results: int = 10) -> list[dict]:
    """List upcoming calendar events."""
    token = await _get_valid_token(user_id)
    now = datetime.now(timezone.utc).isoformat()
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{CALENDAR_BASE}/calendars/primary/events",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "timeMin": now,
                "maxResults": max_results,
                "singleEvents": "true",
                "orderBy": "startTime",
            },
        )
        resp.raise_for_status()
        return resp.json().get("items", [])


async def create_event(
    user_id: str,
    title: str,
    description: str = "",
    start_datetime: str | None = None,
    duration_hours: float = 1.0,
) -> dict:
    """Create a calendar event. If no start_datetime, defaults to next business hour."""
    token = await _get_valid_token(user_id)

    if start_datetime:
        start = datetime.fromisoformat(start_datetime)
    else:
        now = datetime.now(timezone.utc)
        start = now.replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=1)

    end = start + timedelta(hours=duration_hours)

    event_body = {
        "summary": title,
        "description": description,
        "start": {"dateTime": start.isoformat(), "timeZone": "UTC"},
        "end": {"dateTime": end.isoformat(), "timeZone": "UTC"},
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{CALENDAR_BASE}/calendars/primary/events",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=event_body,
        )
        resp.raise_for_status()
        return resp.json()
