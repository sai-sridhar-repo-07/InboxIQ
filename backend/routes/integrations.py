import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from config import settings
from database import get_supabase
from middleware.auth import get_current_user
from services.gmail_service import (
    disconnect_gmail,
    exchange_code,
    get_gmail_tokens,
    get_oauth_url,
    verify_state,
)
from services.slack_service import test_webhook

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/integrations", tags=["integrations"])


def _user_id(current_user: dict) -> str:
    return current_user["id"]


# ---------------------------------------------------------------------------
# Gmail
# ---------------------------------------------------------------------------

@router.get("/gmail/connect")
async def gmail_connect(current_user: Annotated[dict, Depends(get_current_user)]):
    """
    Generate and return the Google OAuth URL to begin the Gmail connection
    flow.
    """
    auth_url = get_oauth_url(user_id=_user_id(current_user))
    return {"auth_url": auth_url}


@router.get("/gmail/callback")
async def gmail_callback(request: Request, code: str, state: str):
    """
    Handle the OAuth callback from Google.

    *state* carries the user_id set during the consent URL generation.
    Redirects the browser to the frontend after completing the exchange.
    """
    try:
        user_id = verify_state(state)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    try:
        await exchange_code(code=code, user_id=user_id)
    except Exception as exc:
        logger.error("Gmail OAuth exchange failed for user_id=%s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth token exchange failed: {exc}",
        )

    # Redirect user back to the frontend settings page
    frontend_url = settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "http://localhost:3000"
    return RedirectResponse(url=f"{frontend_url}/settings?gmail=connected")


@router.delete("/gmail/disconnect", status_code=status.HTTP_204_NO_CONTENT)
async def gmail_disconnect(current_user: Annotated[dict, Depends(get_current_user)]):
    """Revoke Gmail access and remove stored tokens."""
    success = await disconnect_gmail(user_id=_user_id(current_user))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disconnect Gmail.",
        )
    return None


@router.get("/gmail/status")
async def gmail_status(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return whether Gmail is currently connected for the user."""
    tokens = await get_gmail_tokens(user_id=_user_id(current_user))
    connected = tokens is not None and bool(tokens.get("access_token"))
    return {
        "gmail_connected": connected,
        "gmail_address": tokens.get("gmail_address") if tokens else None,
        "last_sync": tokens.get("last_sync") if tokens else None,
        "total_synced": tokens.get("total_synced") if tokens else None,
    }


# ---------------------------------------------------------------------------
# Slack
# ---------------------------------------------------------------------------

class SlackWebhookBody(BaseModel):
    webhook_url: str


@router.post("/slack/webhook", status_code=status.HTTP_200_OK)
async def save_slack_webhook(
    body: SlackWebhookBody,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Save and validate a Slack incoming webhook URL for the user."""
    is_valid = await test_webhook(body.webhook_url)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slack webhook URL is unreachable or invalid.",
        )

    try:
        supabase = get_supabase()
        supabase.table("user_profiles").update(
            {"slack_webhook_url": body.webhook_url}
        ).eq("id", _user_id(current_user)).execute()
    except Exception as exc:
        logger.error("Failed to save Slack webhook: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save Slack webhook.",
        )

    return {"message": "Slack webhook connected successfully."}


@router.post("/slack/test", status_code=status.HTTP_200_OK)
async def test_slack_webhook_endpoint(current_user: Annotated[dict, Depends(get_current_user)]):
    """Send a test message to the user's saved Slack webhook."""
    try:
        supabase = get_supabase()
        result = supabase.table("user_profiles").select("slack_webhook_url").eq(
            "id", _user_id(current_user)
        ).single().execute()
        webhook_url = result.data.get("slack_webhook_url") if result.data else None
    except Exception as exc:
        logger.error("Failed to fetch Slack webhook for test: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve webhook.")

    if not webhook_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No Slack webhook configured.")

    success = await test_webhook(webhook_url)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slack webhook is unreachable.")
    return {"success": True, "message": "Test message sent to Slack."}


@router.delete("/slack/disconnect", status_code=status.HTTP_204_NO_CONTENT)
async def slack_disconnect(current_user: Annotated[dict, Depends(get_current_user)]):
    """Remove the stored Slack webhook URL for the user."""
    try:
        supabase = get_supabase()
        supabase.table("user_profiles").update({"slack_webhook_url": None}).eq(
            "id", _user_id(current_user)
        ).execute()
    except Exception as exc:
        logger.error("Failed to disconnect Slack: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to disconnect Slack.",
        )
    return None
