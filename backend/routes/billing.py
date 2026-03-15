import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from middleware.auth import get_current_user
from services.stripe_service import (
    create_billing_portal_session,
    create_checkout_session,
    get_subscription_status,
    handle_webhook,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])


class CheckoutRequest(BaseModel):
    price_id: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/status")
async def billing_status(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return the current subscription plan and Stripe status."""
    return await get_subscription_status(user_id=current_user["id"])


@router.post("/checkout")
async def create_checkout(
    body: CheckoutRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """
    Create a Stripe Checkout Session and return the hosted payment URL.
    """
    url = await create_checkout_session(
        user_id=current_user["id"],
        price_id=body.price_id,
        email=current_user.get("email", ""),
    )
    if not url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create checkout session.",
        )
    return {"checkout_url": url}


@router.get("/portal")
async def billing_portal(current_user: Annotated[dict, Depends(get_current_user)]):
    """
    Create a Stripe Customer Portal session and return the portal URL so
    the user can manage/cancel their subscription.
    """
    from database import get_supabase

    supabase = get_supabase()
    result = (
        supabase.table("user_profiles")
        .select("stripe_customer_id")
        .eq("id", current_user["id"])
        .single()
        .execute()
    )
    customer_id = (result.data or {}).get("stripe_customer_id")

    if not customer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Stripe customer found. Please subscribe first.",
        )

    url = await create_billing_portal_session(customer_id=customer_id)
    if not url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create billing portal session.",
        )
    return {"portal_url": url}


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request):
    """
    Receive and process Stripe webhook events.

    This endpoint must be reachable by Stripe (public URL) and must NOT
    require authentication.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        result = await handle_webhook(payload=payload, sig_header=sig_header)
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("Stripe webhook processing error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed.",
        )
