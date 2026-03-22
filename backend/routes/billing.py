import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from middleware.auth import get_current_user
from services.razorpay_service import (
    create_subscription,
    get_subscription_status,
    cancel_subscription,
    handle_webhook,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])


class CheckoutRequest(BaseModel):
    plan_id: str           # "pro" | "agency"
    interval: str = "monthly"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/status")
async def billing_status(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return the current subscription plan and usage."""
    return await get_subscription_status(user_id=current_user["id"])


@router.get("/payment-check")
async def payment_config_check(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return which Razorpay env vars are configured (values masked)."""
    from config import settings
    return {
        "RAZORPAY_KEY_ID":         bool(settings.RAZORPAY_KEY_ID),
        "RAZORPAY_KEY_SECRET":     bool(settings.RAZORPAY_KEY_SECRET),
        "RAZORPAY_PRO_PLAN_ID":    settings.RAZORPAY_PRO_PLAN_ID or "NOT SET",
        "RAZORPAY_AGENCY_PLAN_ID": settings.RAZORPAY_AGENCY_PLAN_ID or "NOT SET",
        "FRONTEND_URL":            settings.FRONTEND_URL or "NOT SET",
    }


@router.post("/checkout")
async def create_checkout(
    body: CheckoutRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """
    Create a Razorpay subscription and return the hosted checkout URL.
    """
    if body.plan_id not in ("pro", "agency"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="plan_id must be 'pro' or 'agency'.",
        )

    try:
        url = await create_subscription(
            user_id=current_user["id"],
            plan_id=body.plan_id,
            email=current_user.get("email", ""),
        )
    except RuntimeError as exc:
        logger.error("Checkout failed for user %s: %s", current_user["id"], exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    return {"checkout_url": url}


@router.post("/cancel")
async def cancel_user_subscription(current_user: Annotated[dict, Depends(get_current_user)]):
    """Cancel the current user's active Razorpay subscription."""
    from database import get_supabase
    supabase = get_supabase()
    result = (
        supabase.table("user_profiles")
        .select("subscription_id")
        .eq("id", current_user["id"])
        .single()
        .execute()
    )
    subscription_id = (result.data or {}).get("subscription_id")
    if not subscription_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active subscription found.")
    try:
        await cancel_subscription(subscription_id)
        return {"message": "Subscription cancelled successfully."}
    except Exception as exc:
        logger.error("Cancel subscription error for user %s: %s", current_user["id"], exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.post("/webhook", include_in_schema=False)
async def razorpay_webhook(request: Request):
    """
    Receive and process Razorpay webhook events.
    Must be publicly reachable — no auth required.
    """
    payload = await request.body()
    sig_header = request.headers.get("x-razorpay-signature", "")

    try:
        result = await handle_webhook(payload=payload, sig_header=sig_header)
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("Razorpay webhook processing error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed.",
        )
