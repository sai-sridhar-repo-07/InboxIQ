"""
Scheduled email sends — store emails to be sent at a future time.

Requires a `scheduled_sends` table in Supabase:
    CREATE TABLE scheduled_sends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        to_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        send_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        sent_at TIMESTAMPTZ,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
"""
import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_supabase
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scheduled-sends", tags=["scheduled-sends"])


def _uid(current_user: dict) -> str:
    return current_user["id"]


class ScheduleBody(BaseModel):
    to: str
    subject: str
    body: str
    send_at: str  # ISO datetime string


@router.post("", response_model=dict, status_code=201)
async def create_scheduled_send(
    body: ScheduleBody,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Schedule an email to be sent at a future time."""
    user_id = _uid(current_user)
    try:
        send_at = datetime.fromisoformat(body.send_at.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid send_at datetime format.")
    if send_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="send_at must be in the future.")

    supabase = get_supabase()
    try:
        result = supabase.table("scheduled_sends").insert({
            "user_id": user_id,
            "to_email": body.to,
            "subject": body.subject,
            "body": body.body,
            "send_at": send_at.isoformat(),
            "status": "pending",
        }).execute()
        return result.data[0] if result.data else {"ok": True}
    except Exception as exc:
        logger.error("create_scheduled_send error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to schedule email. Ensure the scheduled_sends table exists in Supabase.")


@router.get("", response_model=dict)
async def list_scheduled_sends(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """List all pending scheduled sends for the current user."""
    user_id = _uid(current_user)
    supabase = get_supabase()
    try:
        result = supabase.table("scheduled_sends").select("*").eq(
            "user_id", user_id
        ).order("send_at", desc=False).execute()
        return {"items": result.data or []}
    except Exception as exc:
        logger.error("list_scheduled_sends error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch scheduled sends.")


@router.delete("/{send_id}", status_code=204)
async def cancel_scheduled_send(
    send_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Cancel a scheduled send (only if still pending)."""
    user_id = _uid(current_user)
    supabase = get_supabase()
    try:
        result = supabase.table("scheduled_sends").delete().eq(
            "id", send_id
        ).eq("user_id", user_id).eq("status", "pending").execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Scheduled send not found or already sent.")
        return None
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("cancel_scheduled_send error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to cancel scheduled send.")
