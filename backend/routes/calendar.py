"""
Google Calendar integration routes.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from config import settings
from database import get_supabase
from middleware.auth import get_current_user
from services.calendar_service import (
    get_auth_url, exchange_code, list_upcoming_events, create_event
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/integrations/calendar", tags=["calendar"])


def _uid(u: dict) -> str:
    return u["id"]


class CreateEventBody(BaseModel):
    title: str
    description: str = ""
    start_datetime: str | None = None
    duration_hours: float = 1.0


@router.get("/connect")
async def connect_calendar(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return Google Calendar OAuth URL."""
    if not settings.GCAL_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google Calendar not configured.")
    url = get_auth_url(state=_uid(current_user))
    return {"auth_url": url}


@router.get("/callback")
async def calendar_callback(
    code: str = Query(...),
    state: str = Query(""),
    error: str | None = Query(None),
):
    """Handle Google Calendar OAuth callback."""
    if error:
        return RedirectResponse(url="/settings?gcal_error=true")

    user_id = state
    if not user_id:
        return RedirectResponse(url="/settings?gcal_error=true")

    try:
        tokens = await exchange_code(code)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))

        supabase = get_supabase()
        supabase.table("user_profiles").update({
            "gcal_connected": True,
            "gcal_access_token": tokens["access_token"],
            "gcal_refresh_token": tokens.get("refresh_token", ""),
            "gcal_token_expires_at": expires_at.isoformat(),
        }).eq("id", user_id).execute()

        return RedirectResponse(url="/settings?gcal_connected=true")
    except Exception as exc:
        logger.error("GCal callback error: %s", exc)
        return RedirectResponse(url="/settings?gcal_error=true")


@router.get("/status")
async def calendar_status(current_user: Annotated[dict, Depends(get_current_user)]):
    supabase = get_supabase()
    row = supabase.table("user_profiles").select(
        "gcal_connected"
    ).eq("id", _uid(current_user)).single().execute()
    data = row.data or {}
    return {"connected": bool(data.get("gcal_connected"))}


@router.get("/events")
async def get_upcoming_events(
    current_user: Annotated[dict, Depends(get_current_user)],
    max_results: int = Query(10, ge=1, le=50),
):
    """List upcoming Google Calendar events."""
    try:
        events = await list_upcoming_events(_uid(current_user), max_results)
        return {"events": events}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("list_events error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch calendar events.")


@router.post("/events")
async def create_calendar_event(
    body: CreateEventBody,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Create a Google Calendar event."""
    try:
        event = await create_event(
            user_id=_uid(current_user),
            title=body.title,
            description=body.description,
            start_datetime=body.start_datetime,
            duration_hours=body.duration_hours,
        )
        return {"event": event, "html_link": event.get("htmlLink")}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("create_event error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create calendar event.")


@router.delete("/disconnect")
async def disconnect_calendar(current_user: Annotated[dict, Depends(get_current_user)]):
    supabase = get_supabase()
    supabase.table("user_profiles").update({
        "gcal_connected": False,
        "gcal_access_token": None,
        "gcal_refresh_token": None,
        "gcal_token_expires_at": None,
    }).eq("id", _uid(current_user)).execute()
    return {"message": "Google Calendar disconnected."}
