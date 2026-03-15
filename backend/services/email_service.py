import logging
import re
from datetime import datetime
from typing import Any

from database import get_supabase
from models.email import EmailCreate, EmailFilter

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------------

def _parse_sender(sender: str) -> tuple[str, str]:
    """Parse 'Name <email>' or plain 'email' into (from_name, from_email)."""
    sender = (sender or "").strip()
    match = re.match(r'^"?([^"<]+)"?\s*<([^>]+)>\s*$', sender)
    if match:
        return match.group(1).strip().strip('"'), match.group(2).strip()
    return "", sender


def _priority_level(score: int) -> str:
    if score >= 8:
        return "high"
    if score >= 5:
        return "medium"
    return "low"


_CATEGORY_MAP = {
    "urgent_client_request": "urgent",
    "quote_request": "needs_response",
    "support_issue": "needs_response",
    "internal_communication": "fyi",
    "follow_up_required": "follow_up",
    "informational": "fyi",
    "spam": "spam",
    "urgent": "urgent",
    "needs_response": "needs_response",
    "follow_up": "follow_up",
    "fyi": "fyi",
    "newsletter": "newsletter",
    "other": "other",
}


def _normalize_email(row: dict) -> dict:
    """Transform a flat DB email row to match the frontend Email type."""
    from_name, from_email = _parse_sender(row.get("sender", ""))
    body_text = row.get("body", "")
    priority = row.get("priority") or 0

    ai_analysis = None
    if row.get("processed") and row.get("ai_summary"):
        ai_analysis = {
            "category": _CATEGORY_MAP.get(row.get("category") or "", "other"),
            "priority_score": priority,
            "priority_level": _priority_level(priority),
            "summary": row.get("ai_summary", ""),
            "sentiment": "neutral",
            "confidence": float(row.get("confidence_score") or 0.0),
            "key_topics": [],
            "action_required": False,
            "processed_at": row.get("created_at", ""),
        }

    return {
        **row,
        "from_name": from_name,
        "from_email": from_email,
        "to_email": "",
        "snippet": body_text[:200],
        "body_text": body_text,
        "body_html": None,
        "gmail_thread_id": row.get("thread_id"),
        "is_read": False,
        "is_starred": False,
        "labels": [],
        "ai_analysis": ai_analysis,
        "updated_at": row.get("created_at", ""),
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def _apply_email_filters(query, filters: EmailFilter):
    if filters.category:
        # Map frontend category to possible backend values
        backend_cats = [
            k for k, v in _CATEGORY_MAP.items() if v == filters.category
        ]
        if len(backend_cats) == 1:
            query = query.eq("category", backend_cats[0])
        elif len(backend_cats) > 1:
            query = query.in_("category", backend_cats)
    if filters.min_priority is not None:
        query = query.gte("priority", filters.min_priority)
    if filters.processed is not None:
        query = query.eq("processed", filters.processed)
    if filters.search:
        query = query.or_(f"subject.ilike.%{filters.search}%,sender.ilike.%{filters.search}%")
    return query


async def get_emails(user_id: str, filters: EmailFilter) -> list[dict]:
    """Return a paginated list of emails for a user with optional filters."""
    try:
        supabase = get_supabase()
        sort_col = filters.sort_by or "received_at"
        sort_desc = (filters.sort_order or "desc").lower() != "asc"

        query = (
            supabase.table("emails")
            .select("*")
            .eq("user_id", user_id)
            .order(sort_col, desc=sort_desc)
            .range(filters.offset, filters.offset + filters.limit - 1)
        )
        query = _apply_email_filters(query, filters)
        result = query.execute()
        return [_normalize_email(r) for r in (result.data or [])]

    except Exception as exc:
        logger.error("get_emails error (user_id=%s): %s", user_id, exc)
        return []


async def count_emails(user_id: str, filters: EmailFilter) -> int:
    """Return the total count of emails matching the given filters."""
    try:
        supabase = get_supabase()
        query = (
            supabase.table("emails")
            .select("id", count="exact")
            .eq("user_id", user_id)
        )
        query = _apply_email_filters(query, filters)
        result = query.execute()
        return result.count or 0
    except Exception as exc:
        logger.error("count_emails error (user_id=%s): %s", user_id, exc)
        return 0


async def get_email(email_id: str, user_id: str) -> dict | None:
    """Fetch a single email ensuring it belongs to the given user."""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("emails")
            .select("*")
            .eq("id", email_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return _normalize_email(result.data) if result.data else None
    except Exception as exc:
        logger.error("get_email error (email_id=%s): %s", email_id, exc)
        return None


async def create_email(email_data: EmailCreate) -> dict | None:
    """Insert a new email row and return the created record."""
    try:
        supabase = get_supabase()
        payload = email_data.model_dump()
        payload["received_at"] = payload["received_at"].isoformat()
        result = supabase.table("emails").insert(payload).execute()
        return result.data[0] if result.data else None
    except Exception as exc:
        logger.error("create_email error: %s", exc)
        return None


async def update_email_analysis(email_id: str, analysis: dict) -> dict | None:
    """
    Persist AI analysis results onto an existing email row.

    Expected keys in *analysis*: category, priority_score, summary,
    confidence_score.
    """
    try:
        supabase = get_supabase()
        update_payload = {
            "category": analysis.get("category"),
            "priority": analysis.get("priority_score"),
            "ai_summary": analysis.get("summary"),
            "confidence_score": analysis.get("confidence_score"),
            "processed": True,
        }
        result = (
            supabase.table("emails")
            .update(update_payload)
            .eq("id", email_id)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as exc:
        logger.error("update_email_analysis error (email_id=%s): %s", email_id, exc)
        return None


async def delete_email(email_id: str, user_id: str) -> bool:
    """Delete an email if it belongs to the given user."""
    try:
        supabase = get_supabase()
        supabase.table("emails").delete().eq("id", email_id).eq(
            "user_id", user_id
        ).execute()
        return True
    except Exception as exc:
        logger.error("delete_email error (email_id=%s): %s", email_id, exc)
        return False


# ---------------------------------------------------------------------------
# Aggregate queries
# ---------------------------------------------------------------------------

async def get_email_stats(user_id: str) -> dict:
    """
    Return summary counts grouped by category and by priority band.
    """
    try:
        supabase = get_supabase()

        all_result = (
            supabase.table("emails")
            .select("category, priority, processed")
            .eq("user_id", user_id)
            .execute()
        )
        rows = all_result.data or []

        by_category: dict[str, int] = {}
        by_priority: dict[str, int] = {"high": 0, "medium": 0, "low": 0}
        total = len(rows)
        unprocessed = 0

        for row in rows:
            cat = _CATEGORY_MAP.get(row.get("category") or "", "other")
            by_category[cat] = by_category.get(cat, 0) + 1

            pri = row.get("priority") or 0
            if pri >= 8:
                by_priority["high"] += 1
            elif pri >= 5:
                by_priority["medium"] += 1
            else:
                by_priority["low"] += 1

            if not row.get("processed"):
                unprocessed += 1

        return {
            "total": total,
            "unprocessed": unprocessed,
            "by_category": by_category,
            "by_priority": by_priority,
        }

    except Exception as exc:
        logger.error("get_email_stats error (user_id=%s): %s", user_id, exc)
        return {"total": 0, "unprocessed": 0, "by_category": {}, "by_priority": {}}


async def get_priority_inbox(user_id: str) -> dict:
    """
    Return emails organised into three priority sections:
      - urgent   (priority >= 8)
      - important (priority 5-7)
      - other    (priority < 5)
    """
    try:
        supabase = get_supabase()
        result = (
            supabase.table("emails")
            .select("*")
            .eq("user_id", user_id)
            .order("priority", desc=True)
            .order("received_at", desc=True)
            .limit(200)
            .execute()
        )
        rows = [_normalize_email(r) for r in (result.data or [])]

        urgent = [r for r in rows if (r.get("priority") or 0) >= 8]
        important = [r for r in rows if 5 <= (r.get("priority") or 0) < 8]
        other = [r for r in rows if (r.get("priority") or 0) < 5]

        return {"urgent": urgent, "important": important, "other": other}

    except Exception as exc:
        logger.error("get_priority_inbox error (user_id=%s): %s", user_id, exc)
        return {"urgent": [], "important": [], "other": []}
