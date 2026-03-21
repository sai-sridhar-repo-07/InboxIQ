import logging
import stripe
from config import settings
from database import get_supabase

logger = logging.getLogger(__name__)

# Set at import time. Render redeploys on env var change so this is safe,
# but we also re-set it per call below to handle any edge cases.
stripe.api_key = settings.STRIPE_SECRET_KEY


def _init_stripe() -> None:
    """Re-apply the API key before every Stripe call (defensive)."""
    stripe.api_key = settings.STRIPE_SECRET_KEY

def _build_price_to_plan() -> dict[str, str]:
    """Build the price ID → plan name map from configured env vars."""
    mapping: dict[str, str] = {}
    for price_id in (
        settings.STRIPE_PRO_PRICE_ID,
        settings.STRIPE_PRICE_PRO_MONTHLY,
        settings.STRIPE_PRICE_PRO_YEARLY,
    ):
        if price_id:
            mapping[price_id] = "pro"
    for price_id in (
        settings.STRIPE_AGENCY_PRICE_ID,
        settings.STRIPE_PRICE_AGENCY_MONTHLY,
        settings.STRIPE_PRICE_AGENCY_YEARLY,
    ):
        if price_id:
            mapping[price_id] = "agency"
    return mapping

PRICE_TO_PLAN: dict[str, str] = _build_price_to_plan()


# ---------------------------------------------------------------------------
# Customer management
# ---------------------------------------------------------------------------

async def create_customer(user_id: str, email: str) -> str | None:
    """
    Create a Stripe customer for the given user and store the customer ID in
    Supabase.  Returns the Stripe customer ID.
    """
    try:
        customer = stripe.Customer.create(
            email=email,
            metadata={"user_id": user_id},
        )
        customer_id = customer["id"]

        supabase = get_supabase()
        supabase.table("user_profiles").update(
            {"stripe_customer_id": customer_id}
        ).eq("id", user_id).execute()

        return customer_id

    except Exception as exc:
        logger.error("create_customer error (user_id=%s): %s", user_id, exc)
        return None


async def _get_or_create_customer(user_id: str, email: str) -> str | None:
    """Return the existing Stripe customer ID or create a new one."""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("user_profiles")
            .select("stripe_customer_id")
            .eq("id", user_id)
            .single()
            .execute()
        )
        profile = result.data or {}
        existing = profile.get("stripe_customer_id")
        if existing:
            return existing
        return await create_customer(user_id, email)
    except Exception as exc:
        logger.error(
            "_get_or_create_customer error (user_id=%s): %s", user_id, exc
        )
        return None


# ---------------------------------------------------------------------------
# Checkout & portal
# ---------------------------------------------------------------------------

async def create_checkout_session(
    user_id: str, price_id: str, email: str = ""
) -> str:
    """
    Create a Stripe Checkout Session for subscription upgrade.
    Returns the session URL or raises RuntimeError with a descriptive message.
    """
    _init_stripe()

    if not settings.STRIPE_SECRET_KEY:
        raise RuntimeError("STRIPE_SECRET_KEY not set in Render — go to Render dashboard → Environment and add it (starts with sk_test_ or sk_live_).")

    if not price_id:
        raise RuntimeError("Price ID not set — add STRIPE_PRO_PRICE_ID and STRIPE_AGENCY_PRICE_ID in Render. Get them from Stripe → Products → your plan → Price ID (starts with price_).")

    customer_id = await _get_or_create_customer(user_id, email)
    if not customer_id:
        raise RuntimeError("Could not create or retrieve Stripe customer.")

    frontend_url = (settings.FRONTEND_URL or "http://localhost:3000").rstrip("/")
    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{frontend_url}/billing?success=true&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/billing?canceled=true",
            metadata={"user_id": user_id},
        )
        return session.url
    except stripe.error.AuthenticationError:
        raise RuntimeError("Stripe authentication failed — check STRIPE_SECRET_KEY in Render.")
    except stripe.error.InvalidRequestError as exc:
        raise RuntimeError(f"Stripe invalid request: {exc.user_message or str(exc)}")
    except Exception as exc:
        logger.error("create_checkout_session error (user_id=%s): %s", user_id, exc)
        raise RuntimeError(f"Stripe error: {exc}")


async def create_billing_portal_session(customer_id: str) -> str | None:
    """
    Create a Stripe Customer Portal session so the user can manage their
    subscription.  Returns the portal URL.
    """
    try:
        frontend_url = settings.FRONTEND_URL.rstrip("/") if settings.FRONTEND_URL else "http://localhost:3000"
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{frontend_url}/billing",
        )
        return session.url
    except Exception as exc:
        logger.error(
            "create_billing_portal_session error (customer_id=%s): %s",
            customer_id,
            exc,
        )
        return None


# ---------------------------------------------------------------------------
# Webhook handler
# ---------------------------------------------------------------------------

async def handle_webhook(payload: bytes, sig_header: str) -> dict:
    """
    Verify and dispatch a Stripe webhook event.
    Returns {"status": "ok"} or raises ValueError on signature mismatch.
    """
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError as exc:
        logger.warning("Stripe webhook signature verification failed: %s", exc)
        raise ValueError("Invalid Stripe webhook signature") from exc

    event_type = event["type"]
    logger.info("Stripe webhook received: %s", event_type)

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(event["data"]["object"])
    elif event_type in (
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ):
        await _handle_subscription_change(event["data"]["object"])
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(event["data"]["object"])

    return {"status": "ok"}


async def _handle_checkout_completed(session: dict) -> None:
    user_id = session.get("metadata", {}).get("user_id")
    subscription_id = session.get("subscription")
    if not user_id or not subscription_id:
        return

    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        price_id = subscription["items"]["data"][0]["price"]["id"]
        plan = PRICE_TO_PLAN.get(price_id, "pro")

        supabase = get_supabase()
        supabase.table("user_profiles").update(
            {"plan": plan, "stripe_subscription_id": subscription_id}
        ).eq("id", user_id).execute()

        logger.info("User %s upgraded to plan=%s", user_id, plan)
    except Exception as exc:
        logger.error("_handle_checkout_completed error: %s", exc)


async def _handle_subscription_change(subscription: dict) -> None:
    try:
        customer_id = subscription.get("customer")
        status = subscription.get("status")

        supabase = get_supabase()
        result = (
            supabase.table("user_profiles")
            .select("id")
            .eq("stripe_customer_id", customer_id)
            .single()
            .execute()
        )
        if not result.data:
            return

        user_id = result.data["id"]
        new_plan = "free" if status in ("canceled", "unpaid", "past_due") else "pro"

        supabase.table("user_profiles").update({"plan": new_plan}).eq(
            "id", user_id
        ).execute()

        logger.info(
            "Subscription change for user %s: status=%s → plan=%s",
            user_id,
            status,
            new_plan,
        )
    except Exception as exc:
        logger.error("_handle_subscription_change error: %s", exc)


async def _handle_payment_failed(invoice: dict) -> None:
    customer_id = invoice.get("customer")
    logger.warning("Payment failed for Stripe customer %s", customer_id)


# ---------------------------------------------------------------------------
# Status query
# ---------------------------------------------------------------------------

PLAN_LIMITS = {
    "free": 5,
    "pro": None,
    "agency": None,
}

PLAN_DETAILS = {
    "free":   {"name": "Free",   "price_monthly": 0},
    "pro":    {"name": "Pro",    "price_monthly": 29},
    "agency": {"name": "Agency", "price_monthly": 79},
}


async def get_subscription_status(user_id: str) -> dict:
    """Return the current plan, subscription info, and email usage for a user."""
    try:
        from datetime import datetime, timezone
        supabase = get_supabase()
        result = (
            supabase.table("user_profiles")
            .select("plan, stripe_customer_id, stripe_subscription_id")
            .eq("id", user_id)
            .single()
            .execute()
        )
        profile = result.data or {}
        plan = profile.get("plan", "free")
        subscription_id = profile.get("stripe_subscription_id")

        stripe_status = None
        current_period_end = None
        cancel_at_period_end = False
        if subscription_id:
            try:
                sub = stripe.Subscription.retrieve(subscription_id)
                stripe_status = sub.get("status")
                current_period_end = sub.get("current_period_end")
                cancel_at_period_end = sub.get("cancel_at_period_end", False)
            except Exception as exc:
                logger.warning("Could not retrieve Stripe subscription %s: %s", subscription_id, exc)

        # Count AI-processed emails this calendar month
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
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
            "subscription_status": stripe_status or ("active" if plan != "free" else "none"),
            "stripe_subscription_id": subscription_id,
            "current_period_end": current_period_end,
            "cancel_at_period_end": cancel_at_period_end,
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
