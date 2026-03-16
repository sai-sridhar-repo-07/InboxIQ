import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import get_supabase
from middleware.auth import get_current_user
from models.action import ActionCreate, ActionResponse, ActionUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/actions", tags=["actions"])


def _user_id(current_user: dict) -> str:
    return current_user["id"]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=list[dict])
async def list_actions(
    current_user: Annotated[dict, Depends(get_current_user)],
    status_filter: str | None = Query(None, alias="status"),
    priority: str | None = Query(None),
):
    """List all actions belonging to the current user."""
    try:
        from datetime import datetime, timezone
        supabase = get_supabase()
        query = (
            supabase.table("actions")
            .select("*, emails(user_id, subject, sender)")
            .order("created_at", desc=True)
        )
        # Filter by status
        if status_filter and status_filter != "overdue":
            query = query.eq("status", status_filter)
        if priority:
            query = query.eq("priority", priority)

        result = query.execute()
        rows = result.data or []

        # Filter to only this user's actions (via email join or no email_id)
        user_id = _user_id(current_user)
        rows = [r for r in rows if (r.get("emails") and r["emails"].get("user_id") == user_id) or not r.get("email_id")]

        # Overdue: deadline in past and not completed
        now = datetime.now(timezone.utc).isoformat()
        if status_filter == "overdue":
            rows = [r for r in rows if r.get("deadline") and r["deadline"] < now and r.get("status") != "completed"]

        return rows
    except Exception as exc:
        logger.error("list_actions error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch actions.",
        )


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_action(
    body: ActionCreate,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Manually create a task (not linked to an email)."""
    try:
        supabase = get_supabase()

        # If email_id provided, verify ownership
        if body.email_id:
            email_result = (
                supabase.table("emails")
                .select("id")
                .eq("id", body.email_id)
                .eq("user_id", _user_id(current_user))
                .single()
                .execute()
            )
            if not email_result.data:
                raise HTTPException(status_code=404, detail="Email not found.")

        insert_data = {
            "task": body.task,
            "status": body.status,
            "priority": body.priority or "medium",
            "notes": body.notes,
        }
        if body.email_id:
            insert_data["email_id"] = body.email_id
        if body.deadline:
            insert_data["deadline"] = body.deadline.isoformat()

        result = supabase.table("actions").insert(insert_data).execute()
        return result.data[0] if result.data else {}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("create_action error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to create action.")


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

        # Verify ownership: check via email join or directly for standalone actions
        existing = (
            supabase.table("actions")
            .select("id, email_id, emails(user_id)")
            .eq("id", action_id)
            .single()
            .execute()
        )
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Action not found.",
            )
        row = existing.data
        email_info = row.get("emails")
        if row.get("email_id") and (not email_info or email_info.get("user_id") != _user_id(current_user)):
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

        # Verify ownership: check via email join or directly for standalone actions
        existing = (
            supabase.table("actions")
            .select("id, email_id, emails(user_id)")
            .eq("id", action_id)
            .single()
            .execute()
        )
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Action not found.",
            )
        row = existing.data
        email_info = row.get("emails")
        if row.get("email_id") and (not email_info or email_info.get("user_id") != _user_id(current_user)):
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
