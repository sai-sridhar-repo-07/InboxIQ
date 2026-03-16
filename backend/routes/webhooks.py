"""
Generic outbound webhooks — fire HTTP POST to user-configured URLs
when specific events occur (new urgent email, reply sent, etc.).
"""
import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl

from database import get_supabase
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


# ─── Pydantic models ──────────────────────────────────────────────────────────

class WebhookBody(BaseModel):
    name: str
    url: str  # validated as string; we do basic check below
    event: str  # "urgent_email" | "reply_sent" | "action_created" | "all"
    secret: Optional[str] = None


class WebhookUpdateBody(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    event: Optional[str] = None
    is_active: Optional[bool] = None
    secret: Optional[str] = None


ALLOWED_EVENTS = {"urgent_email", "reply_sent", "action_created", "all"}


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("")
async def list_webhooks(current_user: Annotated[dict, Depends(get_current_user)]):
    """List all webhooks for the current user."""
    uid = current_user["id"]
    supabase = get_supabase()
    result = supabase.table("webhooks").select("*").eq("user_id", uid).order("created_at", desc=True).execute()
    return result.data or []


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_webhook(body: WebhookBody, current_user: Annotated[dict, Depends(get_current_user)]):
    """Create a new outbound webhook."""
    uid = current_user["id"]

    if body.event not in ALLOWED_EVENTS:
        raise HTTPException(status_code=400, detail=f"event must be one of: {', '.join(ALLOWED_EVENTS)}")
    if not body.url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Webhook URL must use HTTPS.")

    supabase = get_supabase()
    result = supabase.table("webhooks").insert({
        "user_id": uid,
        "name": body.name,
        "url": body.url,
        "event": body.event,
        "secret": body.secret,
        "is_active": True,
    }).execute()
    return result.data[0]


@router.patch("/{webhook_id}")
async def update_webhook(webhook_id: str, body: WebhookUpdateBody, current_user: Annotated[dict, Depends(get_current_user)]):
    """Update an existing webhook."""
    uid = current_user["id"]
    supabase = get_supabase()

    # Verify ownership
    existing = supabase.table("webhooks").select("id").eq("id", webhook_id).eq("user_id", uid).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Webhook not found.")

    updates = body.model_dump(exclude_none=True)
    if "event" in updates and updates["event"] not in ALLOWED_EVENTS:
        raise HTTPException(status_code=400, detail=f"event must be one of: {', '.join(ALLOWED_EVENTS)}")

    result = supabase.table("webhooks").update(updates).eq("id", webhook_id).eq("user_id", uid).execute()
    return result.data[0]


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(webhook_id: str, current_user: Annotated[dict, Depends(get_current_user)]):
    """Delete a webhook."""
    uid = current_user["id"]
    supabase = get_supabase()
    supabase.table("webhooks").delete().eq("id", webhook_id).eq("user_id", uid).execute()


@router.post("/{webhook_id}/test")
async def test_webhook(webhook_id: str, current_user: Annotated[dict, Depends(get_current_user)]):
    """Send a test payload to the webhook URL."""
    import httpx
    uid = current_user["id"]
    supabase = get_supabase()
    existing = supabase.table("webhooks").select("*").eq("id", webhook_id).eq("user_id", uid).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Webhook not found.")

    wh = existing.data[0]
    payload = {
        "event": "test",
        "webhook_id": webhook_id,
        "message": "This is a test delivery from InboxIQ.",
    }

    try:
        headers = {"Content-Type": "application/json"}
        if wh.get("secret"):
            headers["X-InboxIQ-Secret"] = wh["secret"]

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(wh["url"], json=payload, headers=headers)
        return {"success": resp.status_code < 400, "status_code": resp.status_code}
    except Exception as exc:
        logger.warning("Webhook test failed for %s: %s", wh["url"], exc)
        return {"success": False, "error": str(exc)}
