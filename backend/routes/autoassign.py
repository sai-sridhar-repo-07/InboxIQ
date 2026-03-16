"""
Auto-assign rules — automatically assign emails to org members based on
sender domain or email category when they are processed by AI.
Rules are stored per organization in the `auto_assign_rules` table
(created by migration).
"""
import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from database import get_supabase
from middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/teams/auto-assign", tags=["auto-assign"])


# ─── Pydantic models ──────────────────────────────────────────────────────────

class AutoAssignRuleBody(BaseModel):
    condition_type: str        # "sender_domain" | "category" | "priority_gte"
    condition_value: str       # e.g. "@client.com" | "urgent" | "7"
    assign_to_user_id: str     # org member's user_id
    is_active: bool = True


class AutoAssignRuleUpdate(BaseModel):
    condition_type: Optional[str] = None
    condition_value: Optional[str] = None
    assign_to_user_id: Optional[str] = None
    is_active: Optional[bool] = None


ALLOWED_CONDITIONS = {"sender_domain", "category", "priority_gte"}


def _get_user_org(user_id: str) -> dict:
    supabase = get_supabase()
    row = supabase.table("user_profiles").select("org_id, org_role, name").eq("id", user_id).single().execute()
    return row.data or {}


def _require_org(user_data: dict) -> str:
    org_id = user_data.get("org_id")
    if not org_id:
        raise HTTPException(status_code=404, detail="You are not part of any organization.")
    return org_id


def _require_admin(user_data: dict):
    if user_data.get("org_role", "member") not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Admin access required.")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("")
async def list_rules(current_user: Annotated[dict, Depends(get_current_user)]):
    """List all auto-assign rules for the organization."""
    uid = current_user["id"]
    user_data = _get_user_org(uid)
    org_id = _require_org(user_data)

    supabase = get_supabase()
    result = supabase.table("auto_assign_rules").select(
        "*, user_profiles!assign_to_user_id(id, name, email)"
    ).eq("org_id", org_id).order("created_at", desc=True).execute()
    return result.data or []


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_rule(body: AutoAssignRuleBody, current_user: Annotated[dict, Depends(get_current_user)]):
    """Create a new auto-assign rule."""
    uid = current_user["id"]
    user_data = _get_user_org(uid)
    org_id = _require_org(user_data)
    _require_admin(user_data)

    if body.condition_type not in ALLOWED_CONDITIONS:
        raise HTTPException(status_code=400, detail=f"condition_type must be one of: {', '.join(ALLOWED_CONDITIONS)}")

    supabase = get_supabase()
    result = supabase.table("auto_assign_rules").insert({
        "org_id": org_id,
        "condition_type": body.condition_type,
        "condition_value": body.condition_value,
        "assign_to_user_id": body.assign_to_user_id,
        "is_active": body.is_active,
    }).execute()
    return result.data[0]


@router.patch("/{rule_id}")
async def update_rule(rule_id: str, body: AutoAssignRuleUpdate, current_user: Annotated[dict, Depends(get_current_user)]):
    """Update an existing rule."""
    uid = current_user["id"]
    user_data = _get_user_org(uid)
    org_id = _require_org(user_data)
    _require_admin(user_data)

    supabase = get_supabase()
    existing = supabase.table("auto_assign_rules").select("id").eq("id", rule_id).eq("org_id", org_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Rule not found.")

    updates = body.model_dump(exclude_none=True)
    result = supabase.table("auto_assign_rules").update(updates).eq("id", rule_id).execute()
    return result.data[0]


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(rule_id: str, current_user: Annotated[dict, Depends(get_current_user)]):
    """Delete an auto-assign rule."""
    uid = current_user["id"]
    user_data = _get_user_org(uid)
    org_id = _require_org(user_data)
    _require_admin(user_data)

    supabase = get_supabase()
    supabase.table("auto_assign_rules").delete().eq("id", rule_id).eq("org_id", org_id).execute()
