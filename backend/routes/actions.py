import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from database import get_supabase
from middleware.auth import get_current_user
from models.action import ActionResponse, ActionUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/actions", tags=["actions"])


def _user_id(current_user: dict) -> str:
    return current_user["id"]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[dict])
async def list_actions(current_user: Annotated[dict, Depends(get_current_user)]):
    """List all actions belonging to the current user."""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("actions")
            .select("*, emails!inner(user_id)")
            .eq("emails.user_id", _user_id(current_user))
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as exc:
        logger.error("list_actions error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch actions.",
        )


@router.get("/email/{email_id}", response_model=list[dict])
async def list_actions_for_email(
    email_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """List all actions linked to a specific email."""
    try:
        supabase = get_supabase()

        # Verify ownership
        email_result = (
            supabase.table("emails")
            .select("id")
            .eq("id", email_id)
            .eq("user_id", _user_id(current_user))
            .single()
            .execute()
        )
        if not email_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email not found.",
            )

        result = (
            supabase.table("actions")
            .select("*")
            .eq("email_id", email_id)
            .order("created_at")
            .execute()
        )
        return result.data or []
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("list_actions_for_email error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch actions.",
        )


@router.put("/{action_id}", response_model=dict)
async def update_action(
    action_id: str,
    body: ActionUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Update an action item (task text, deadline, or status)."""
    try:
        supabase = get_supabase()

        # Verify ownership via join
        existing = (
            supabase.table("actions")
            .select("id, emails!inner(user_id)")
            .eq("id", action_id)
            .eq("emails.user_id", _user_id(current_user))
            .single()
            .execute()
        )
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Action not found.",
            )

        update_data = body.model_dump(exclude_none=True)
        if "deadline" in update_data and update_data["deadline"] is not None:
            update_data["deadline"] = update_data["deadline"].isoformat()

        result = (
            supabase.table("actions")
            .update(update_data)
            .eq("id", action_id)
            .execute()
        )
        return result.data[0] if result.data else {}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("update_action error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update action.",
        )


@router.delete("/{action_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_action(
    action_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Delete an action item."""
    try:
        supabase = get_supabase()

        # Verify ownership
        existing = (
            supabase.table("actions")
            .select("id, emails!inner(user_id)")
            .eq("id", action_id)
            .eq("emails.user_id", _user_id(current_user))
            .single()
            .execute()
        )
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Action not found.",
            )

        supabase.table("actions").delete().eq("id", action_id).execute()
        return None

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("delete_action error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete action.",
        )
