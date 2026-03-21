import hashlib
import hmac
import json
import logging

import razorpay

from config import settings
from database import get_supabase

logger = logging.getLogger(__name__)


def _client() -> razorpay.Client:
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


PLAN_LIMITS: dict[str, int | None] = {
    "free": 5,
    "pro": None,
    "agency": None,
}

PLAN_DETAILS: dict[str, dict] = {
    "free":   {"name": "Free",   "price_monthly": 0},
    "pro":    {"name": "Pro",    "price_monthly": 199},
    "agency": {"name": "Agency", "price_monthly": 1499},
}


# ---------------------------------------------------------------------------
# Checkout
# ---------------------------------------------------------------------------

async def create_subscription(user_id: str, plan_id: str, email: str = "") -> str:
    """
    Create a Razorpay subscription and return the hosted checkout URL (short_url).
    Raises RuntimeError with a descriptive message on failure.
    """
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise RuntimeError(
            "RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set in Render — "
            "add them in Render dashboard → Environment. "
            "Get them from razorpay.com → Settings → API Keys."
        )

    plan_map = {
        "pro": settings.RAZORPAY_PRO_PLAN_ID,
        "agency": settings.RAZORPAY_AGENCY_PLAN_ID,
    }
    razorpay_plan_id = plan_map.get(plan_id, "")
    if not razorpay_plan_id:
        raise RuntimeError(
            f"No Razorpay plan ID configured for '{plan_id}'. "
            "Set RAZORPAY_PRO_PLAN_ID / RAZORPAY_AGENCY_PLAN_ID in Render. "
            "Create plans at razorpay.com → Subscriptions → Plans."
        )

    client = _client()
    try:
        subscription = client.subscription.create({
            "plan_id": razorpay_plan_id,
            "total_count": 120,   # max billing cycles (10 years)
            "quantity": 1,
            "customer_notify": 1,
            "notes": {"user_id": user_id},
            "notify_info": {"notify_email": email} if email else {},
        })

        short_url = subscription.get("short_url")
        if not short_url:
            raise RuntimeError("Razorpay did not return a checkout URL.")

        # Store the pending subscription ID so the webhook can update it later
        supabase = get_supabase()
        supabase.table("user_profiles").update(
            {"stripe_subscription_id": subscription["id"]}
        ).eq("id", user_id).execute()

        return short_url

    except razorpay.errors.BadRequestError as exc:
        raise RuntimeError(f"Razorpay error: {exc}") from exc
    except RuntimeError:
        raise
    except Exception as exc:
        logger.error("create_subscription error (user_id=%s): %s", user_id, exc)
        raise RuntimeError(f"Payment error: {exc}") from exc


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------

async def handle_webhook(payload: bytes, sig_header: str) -> dict:
    """
    Verify Razorpay webhook signature and dispatch the event.
    Raises ValueError on signature mismatch.
    """
    if settings.RAZORPAY_WEBHOOK_SECRET:
        expected = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, sig_header):
            raise ValueError("Invalid Razorpay webhook signature")

    event = json.loads(payload)
    event_type = event.get("event", "")
    logger.info("Razorpay webhook received: %s", event_type)

    if event_type == "subscription.activated":
        await _handle_subscription_activated(
            event["payload"]["subscription"]["entity"]
        )
    elif event_type == "subscription.charged":
        # Recurring payment succeeded — keep plan active
        sub = event["payload"]["subscription"]["entity"]
        logger.info("Subscription charged (renewed): %s", sub.get("id"))
    elif event_type in (
        "subscription.cancelled",
        "subscription.expired",
        "subscription.completed",
        "subscription.halted",
    ):
        await _handle_subscription_deactivated(
            event["payload"]["subscription"]["entity"]
        )
    elif event_type == "invoice.paid":
        logger.info("Invoice paid: %s", event["payload"].get("invoice", {}).get("entity", {}).get("id"))
    elif event_type == "invoice.expired":
        logger.warning("Invoice expired: %s", event["payload"].get("invoice", {}).get("entity", {}).get("id"))
    elif event_type == "payment.failed":
        logger.warning("Razorpay payment failed: %s", event.get("payload"))

    return {"status": "ok"}


async def _handle_subscription_activated(subscription: dict) -> None:
    sub_id = subscription.get("id", "")
    notes = subscription.get("notes") or {}
    user_id = notes.get("user_id")
    razorpay_plan_id = subscription.get("plan_id", "")

    if not user_id:
        logger.warning("subscription.activated — no user_id in notes for sub %s", sub_id)
        return

    plan_name = "agency" if razorpay_plan_id == settings.RAZORPAY_AGENCY_PLAN_ID else "pro"

    supabase = get_supabase()
    supabase.table("user_profiles").update(
        {"plan": plan_name, "stripe_subscription_id": sub_id}
    ).eq("id", user_id).execute()

    logger.info("User %s activated plan=%s (Razorpay sub=%s)", user_id, plan_name, sub_id)


async def _handle_subscription_deactivated(subscription: dict) -> None:
    sub_id = subscription.get("id", "")
    supabase = get_supabase()

    result = (
        supabase.table("user_profiles")
        .select("id")
        .eq("stripe_subscription_id", sub_id)
        .single()
        .execute()
    )
    if not result.data:
        return

    user_id = result.data["id"]
    supabase.table("user_profiles").update({"plan": "free"}).eq("id", user_id).execute()
    logger.info("User %s downgraded to free (sub %s deactivated)", user_id, sub_id)


# ---------------------------------------------------------------------------
# Status query
# ---------------------------------------------------------------------------

async def get_subscription_status(user_id: str) -> dict:
    """Return the current plan and usage for a user."""
    from datetime import datetime, timezone

    try:
        supabase = get_supabase()
        result = (
            supabase.table("user_profiles")
            .select("plan, stripe_subscription_id")
            .eq("id", user_id)
            .single()
            .execute()
        )
        profile = result.data or {}
        plan = profile.get("plan", "free")
        subscription_id = profile.get("stripe_subscription_id")

        now = datetime.now(timezone.utc)
        month_start = now.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        ).isoformat()

        usage_result = (
            supabase.table("emails")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .eq("processed", True)
            .gte("created_at", month_start)
            .execute()
        )
        emails_used = usage_result.count or 0
        email_limit = PLAN_LIMITS.get(plan, 5)

        return {
            "current_plan": plan,
            "plan_details": PLAN_DETAILS.get(plan, PLAN_DETAILS["free"]),
            "subscription_status": "active" if plan != "free" else "none",
            "stripe_subscription_id": subscription_id,
            "current_period_end": None,
            "cancel_at_period_end": False,
            "emails_used_this_month": emails_used,
            "email_limit": email_limit,
        }

    except Exception as exc:
        logger.error("get_subscription_status error (user_id=%s): %s", user_id, exc)
        return {
            "current_plan": "free",
            "plan_details": PLAN_DETAILS["free"],
            "subscription_status": "none",
            "stripe_subscription_id": None,
            "current_period_end": None,
            "cancel_at_period_end": False,
            "emails_used_this_month": 0,
            "email_limit": 5,
        }
