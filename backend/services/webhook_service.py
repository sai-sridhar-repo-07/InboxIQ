"""
Webhook dispatcher — fires outbound HTTP POST requests to user-configured
webhook URLs when Mailair events occur.
"""
import asyncio
import logging
from typing import Any

import httpx

from database import get_supabase

logger = logging.getLogger(__name__)


async def fire_event(user_id: str, event: str, payload: dict[str, Any]) -> None:
    """
    Fire all active webhooks that match the given event for the user.
    Runs fire-and-forget; errors are logged but never raised.
    """
    try:
        supabase = get_supabase()
        # Match webhooks subscribed to this specific event or "all"
        result = supabase.table("webhooks").select("*").eq("user_id", user_id).eq("is_active", True).in_(
            "event", [event, "all"]
        ).execute()
        webhooks = result.data or []
    except Exception as exc:
        logger.warning("Failed to fetch webhooks for user %s: %s", user_id, exc)
        return

    if not webhooks:
        return

    body = {"event": event, **payload}

    async def _send(wh: dict) -> None:
        headers = {"Content-Type": "application/json"}
        if wh.get("secret"):
            headers["X-Mailair-Secret"] = wh["secret"]
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(wh["url"], json=body, headers=headers)
            logger.info("Webhook %s fired for event=%s → %s", wh["id"], event, resp.status_code)
        except Exception as exc:
            logger.warning("Webhook %s delivery failed: %s", wh["id"], exc)

    await asyncio.gather(*[_send(wh) for wh in webhooks], return_exceptions=True)


def fire_event_sync(user_id: str, event: str, payload: dict[str, Any]) -> None:
    """Synchronous wrapper — runs the async dispatcher in the background."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(fire_event(user_id, event, payload))
        else:
            loop.run_until_complete(fire_event(user_id, event, payload))
    except Exception as exc:
        logger.warning("fire_event_sync error: %s", exc)
