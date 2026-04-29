"""
Outlook / Microsoft 365 integration routes.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from config import settings
from database import get_supabase
from middleware.auth import get_current_user
from services.outlook_service import (
    get_auth_url, exchange_code, get_outlook_profile, sync_outlook_emails
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/integrations/outlook", tags=["outlook"])


def _uid(current_user: dict) -> str:
    return current_user["id"]


@router.get("/connect")
async def connect_outlook(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return the Microsoft OAuth authorization URL."""
    if not settings.MS_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Outlook integration not configured.")
    url = get_auth_url(state=_uid(current_user))
    return {"auth_url": url}


@router.get("/callback")
async def outlook_callback(
    code: str = Query(...),
    state: str = Query(""),
    error: str | None = Query(None),
):
    """Handle Microsoft OAuth callback — exchange code for tokens."""
    if error:
        logger.error("Outlook OAuth error: %s", error)
        return RedirectResponse(url="/settings?outlook_error=true")

    user_id = state
    if not user_id:
        return RedirectResponse(url="/settings?outlook_error=true")

    try:
        tokens = await exchange_code(code)
        access_token = tokens["access_token"]
        refresh_tok = tokens.get("refresh_token", "")
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))

        profile = await get_outlook_profile(access_token)
        ms_email = profile.get("mail") or profile.get("userPrincipalName", "")

        supabase = get_supabase()
        supabase.table("user_profiles").update({
            "ms_connected": True,
            "ms_email": ms_email,
            "ms_access_token": access_token,
            "ms_refresh_token": refresh_tok,
            "ms_token_expires_at": expires_at.isoformat(),
        }).eq("id", user_id).execute()

        return RedirectResponse(url="/settings?outlook_connected=true")
    except Exception as exc:
        logger.error("Outlook callback error: %s", exc)
        return RedirectResponse(url="/settings?outlook_error=true")


@router.get("/status")
async def outlook_status(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return Outlook connection status."""
    try:
        supabase = get_supabase()
        row = supabase.table("user_profiles").select(
            "ms_connected, ms_email"
        ).eq("id", _uid(current_user)).single().execute()
        data = row.data or {}
        return {"connected": bool(data.get("ms_connected")), "email": data.get("ms_email")}
    except Exception:
        return {"connected": False, "email": None}


@router.post("/sync")
async def sync_outlook(
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Trigger an Outlook email sync in the background."""
    uid = _uid(current_user)
    background_tasks.add_task(_do_sync, uid)
    return {"message": "Outlook sync started."}


async def _do_sync(user_id: str):
    try:
        count = await sync_outlook_emails(user_id)
        logger.info("Outlook sync: %d new emails for user %s", count, user_id)
    except Exception as exc:
        logger.error("Outlook sync failed for user %s: %s", user_id, exc)


@router.delete("/disconnect")
async def disconnect_outlook(current_user: Annotated[dict, Depends(get_current_user)]):
    """Disconnect Outlook integration."""
    supabase = get_supabase()
    supabase.table("user_profiles").update({
        "ms_connected": False,
        "ms_email": None,
        "ms_access_token": None,
        "ms_refresh_token": None,
        "ms_token_expires_at": None,
    }).eq("id", _uid(current_user)).execute()
    return {"message": "Outlook disconnected."}
