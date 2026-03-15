import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from database import get_supabase
from middleware.auth import get_current_user
from models.user import UserProfile, UserUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])


def _user_id(current_user: dict) -> str:
    return current_user["id"]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=dict)
async def get_settings(current_user: Annotated[dict, Depends(get_current_user)]):
    """
    Return all user settings including integration status and preferences.
    """
    try:
        supabase = get_supabase()
        result = (
            supabase.table("user_profiles")
            .select("*")
            .eq("id", _user_id(current_user))
            .single()
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found.",
            )
        return result.data
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("get_settings error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve settings.",
        )


@router.put("", response_model=dict)
async def update_settings(
    body: UserUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Update user preferences and settings."""
    try:
        supabase = get_supabase()
        update_data = body.model_dump(exclude_none=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields provided for update.",
            )

        result = (
            supabase.table("user_profiles")
            .update(update_data)
            .eq("id", _user_id(current_user))
            .execute()
        )
        return result.data[0] if result.data else {}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("update_settings error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update settings.",
        )


@router.get("/profile", response_model=dict)
async def get_profile(current_user: Annotated[dict, Depends(get_current_user)]):
    """
    Return a subset of the user profile (name, email, plan, connected
    integrations).
    """
    try:
        supabase = get_supabase()
        result = (
            supabase.table("user_profiles")
            .select(
                "id, name, email, plan, gmail_connected, tone_preference,"
                " company_description, created_at"
            )
            .eq("id", _user_id(current_user))
            .single()
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found.",
            )
        return result.data
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("get_profile error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile.",
        )


@router.put("/profile", response_model=dict)
async def update_profile(
    body: UserUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Update the user's public profile fields."""
    try:
        supabase = get_supabase()
        update_data = body.model_dump(exclude_none=True)

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields provided for update.",
            )

        result = (
            supabase.table("user_profiles")
            .update(update_data)
            .eq("id", _user_id(current_user))
            .execute()
        )
        return result.data[0] if result.data else {}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("update_profile error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile.",
        )
