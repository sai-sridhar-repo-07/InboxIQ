"""
Browser push notification routes.
Uses py-vapid + pywebpush to send Web Push messages.

Required env vars:
  VAPID_PRIVATE_KEY  — base64url-encoded VAPID private key
  VAPID_PUBLIC_KEY   — base64url-encoded VAPID public key
  VAPID_EMAIL        — mailto: claim for VAPID (e.g. mailto:admin@mailair.company)
"""
import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from database import get_supabase
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/push", tags=["push"])


class PushSubscriptionBody(BaseModel):
    endpoint: str
    keys: dict  # {p256dh: str, auth: str}


class SendPushBody(BaseModel):
    title: str
    body: str
    url: str = "/email"
    tag: str = "mailair"


def _current_user_id(current_user: dict) -> str:
    return current_user["id"]


@router.post("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe(
    body: PushSubscriptionBody,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Save or update the user's push subscription."""
    supabase = get_supabase()
    user_id = _current_user_id(current_user)
    supabase.table("push_subscriptions").upsert(
        {
            "user_id": user_id,
            "endpoint": body.endpoint,
            "p256dh": body.keys.get("p256dh", ""),
            "auth": body.keys.get("auth", ""),
        },
        on_conflict="user_id",
    ).execute()
    return None


@router.delete("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Remove the user's push subscription."""
    supabase = get_supabase()
    supabase.table("push_subscriptions").delete().eq(
        "user_id", _current_user_id(current_user)
    ).execute()
    return None


@router.get("/vapid-key")
async def get_vapid_public_key():
    """Return the VAPID public key for the frontend to subscribe."""
    from config import settings
    key = getattr(settings, "VAPID_PUBLIC_KEY", "")
    return {"public_key": key}


async def send_push_to_user(user_id: str, title: str, body: str, url: str = "/email") -> bool:
    """Send a Web Push notification to a specific user. Returns True if delivered."""
    try:
        from config import settings
        private_key = getattr(settings, "VAPID_PRIVATE_KEY", "")
        public_key  = getattr(settings, "VAPID_PUBLIC_KEY", "")
        vapid_email = getattr(settings, "VAPID_EMAIL", "mailto:admin@mailair.company")

        if not private_key or not public_key:
            logger.debug("VAPID keys not configured — skipping push for user %s", user_id)
            return False

        supabase = get_supabase()
        row = supabase.table("push_subscriptions").select("*").eq("user_id", user_id).single().execute()
        if not row.data:
            return False

        sub = row.data
        subscription_info = {
            "endpoint": sub["endpoint"],
            "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
        }

        payload = json.dumps({"title": title, "body": body, "url": url, "tag": "mailair-urgent"})

        from pywebpush import webpush, WebPushException
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=private_key,
            vapid_claims={"sub": vapid_email},
        )
        return True

    except Exception as exc:
        logger.warning("send_push_to_user failed for %s: %s", user_id, exc)
        return False
