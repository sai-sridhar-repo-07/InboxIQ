import logging
import re
from datetime import datetime, timezone
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
        "is_read": row.get("is_read", False),
        "is_starred": row.get("starred", False),
        "starred": row.get("starred", False),
        "snooze_until": row.get("snooze_until"),
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
            .neq("dismissed", True)
            .order(sort_col, desc=sort_desc)
            .range(filters.offset, filters.offset + filters.limit - 1)
        )
        query = _apply_email_filters(query, filters)
        result = query.execute()
        now = datetime.now(timezone.utc)
        rows = [
            _normalize_email(r) for r in (result.data or [])
            if not r.get("snooze_until") or
            datetime.fromisoformat(r["snooze_until"].replace("Z", "+00:00")) <= now
        ]
        return rows

    except Exception as exc:
        logger.error("get_emails error (user_id=%s): %s", user_id, exc)
        return []


async def count_emails(user_id: str, filters: EmailFilter) -> int:
    """Return the total count of emails matching the given filters."""
    try:
        supabase = get_supabase()
        query = (
            supabase.table("emails")
            .select("id, snooze_until")
            .eq("user_id", user_id)
            .neq("dismissed", True)
        )
        query = _apply_email_filters(query, filters)
        result = query.execute()
        now = datetime.now(timezone.utc)
        rows = [
            r for r in (result.data or [])
            if not r.get("snooze_until") or
            datetime.fromisoformat(r["snooze_until"].replace("Z", "+00:00")) <= now
        ]
        return len(rows)
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
    """
    Soft-delete an email by marking it as dismissed.

    The row is kept in the DB so the gmail_message_id duplicate-check in the
    sync pipeline will still find it and never re-import the email.
    """
    try:
        supabase = get_supabase()
        supabase.table("emails").update({"dismissed": True}).eq(
            "id", email_id
        ).eq("user_id", user_id).execute()
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
            .neq("dismissed", True)
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

        processed = total - unprocessed

        # Count action items
        action_items_count = 0
        try:
            actions_result = (
                supabase.table("actions")
                .select("id", count="exact")
                .in_("email_id", [
                    r["id"] for r in
                    supabase.table("emails").select("id").eq("user_id", user_id).execute().data or []
                ])
                .eq("status", "pending")
                .execute()
            )
            action_items_count = actions_result.count or 0
        except Exception:
            pass

        return {
            # Fields the frontend/dashboard expects
            "total_emails": total,
            "urgent_count": by_category.get("urgent", 0),
            "needs_response_count": by_category.get("needs_response", 0),
            "action_items_count": action_items_count,
            "processed_today": processed,
            "avg_priority_score": 0,
            "category_breakdown": by_category,
            "emails_this_week": total,
            "emails_last_week": 0,
            # Keep legacy fields too
            "total": total,
            "unprocessed": unprocessed,
            "by_category": by_category,
            "by_priority": by_priority,
        }

    except Exception as exc:
        logger.error("get_email_stats error (user_id=%s): %s", user_id, exc)
        return {
            "total_emails": 0, "urgent_count": 0, "needs_response_count": 0,
            "action_items_count": 0, "processed_today": 0, "avg_priority_score": 0,
            "category_breakdown": {}, "emails_this_week": 0, "emails_last_week": 0,
            "total": 0, "unprocessed": 0, "by_category": {}, "by_priority": {},
        }


async def mark_email_read(email_id: str, user_id: str) -> bool:
    """Mark an email as read."""
    try:
        supabase = get_supabase()
        supabase.table("emails").update({"is_read": True}).eq("id", email_id).eq("user_id", user_id).execute()
        return True
    except Exception as exc:
        logger.error("mark_email_read error: %s", exc)
        return False


async def get_unprocessed_email_ids(user_id: str) -> list[str]:
    """Return IDs of unprocessed emails for a user (max 50)."""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("emails")
            .select("id")
            .eq("user_id", user_id)
            .eq("processed", False)
            .neq("dismissed", True)
            .limit(50)
            .execute()
        )
        return [r["id"] for r in (result.data or [])]
    except Exception as exc:
        logger.error("get_unprocessed_email_ids error: %s", exc)
        return []


async def get_analytics(user_id: str) -> dict:
    """Return analytics data for the user's emails."""
    from datetime import timedelta, timezone
    try:
        supabase = get_supabase()
        result = (
            supabase.table("emails")
            .select("category, priority, processed, received_at, is_read")
            .eq("user_id", user_id)
            .execute()
        )
        rows = result.data or []

        # Category breakdown
        by_category: dict[str, int] = {}
        for row in rows:
            cat = _CATEGORY_MAP.get(row.get("category") or "", "other")
            by_category[cat] = by_category.get(cat, 0) + 1

        # Priority breakdown
        by_priority = {"high": 0, "medium": 0, "low": 0}
        for row in rows:
            p = row.get("priority") or 0
            if p >= 8:   by_priority["high"] += 1
            elif p >= 5: by_priority["medium"] += 1
            else:        by_priority["low"] += 1

        # Emails per day (last 7 days)
        now = datetime.now(timezone.utc)
        daily: dict[str, int] = {}
        for i in range(6, -1, -1):
            day = (now - timedelta(days=i)).strftime("%a")
            daily[day] = 0
        for row in rows:
            try:
                received = datetime.fromisoformat(row["received_at"].replace("Z", "+00:00"))
                delta = (now - received).days
                if 0 <= delta <= 6:
                    day = received.strftime("%a")
                    if day in daily:
                        daily[day] += 1
            except Exception:
                pass

        # Processing rate
        total = len(rows)
        processed = sum(1 for r in rows if r.get("processed"))
        unread = sum(1 for r in rows if not r.get("is_read"))

        return {
            "total_emails": total,
            "processed_emails": processed,
            "unread_emails": unread,
            "processing_rate": round((processed / total * 100) if total else 0, 1),
            "by_category": by_category,
            "by_priority": by_priority,
            "emails_per_day": [{"day": k, "count": v} for k, v in daily.items()],
        }
    except Exception as exc:
        logger.error("get_analytics error: %s", exc)
        return {"total_emails": 0, "processed_emails": 0, "unread_emails": 0,
                "processing_rate": 0, "by_category": {}, "by_priority": {}, "emails_per_day": []}


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
            .neq("dismissed", True)
            .order("priority", desc=True)
            .order("received_at", desc=True)
            .limit(200)
            .execute()
        )
        now = datetime.now(timezone.utc)
        rows = [
            _normalize_email(r) for r in (result.data or [])
            if not r.get("snooze_until") or
            datetime.fromisoformat(r["snooze_until"].replace("Z", "+00:00")) <= now
        ]

        def cat(r):
            return _CATEGORY_MAP.get(r.get("category") or "", "other")

        urgent       = [r for r in rows if cat(r) == "urgent"]
        needs_resp   = [r for r in rows if cat(r) == "needs_response"]
        follow_up    = [r for r in rows if cat(r) == "follow_up"]
        low_priority = [r for r in rows if cat(r) in ("fyi", "newsletter", "other", "spam")]

        return {
            "urgent": urgent,
            "needs_response": needs_resp,
            "follow_up": follow_up,
            "low_priority": low_priority,
        }

    except Exception as exc:
        logger.error("get_priority_inbox error (user_id=%s): %s", user_id, exc)
        return {"urgent": [], "important": [], "other": []}


# ---------------------------------------------------------------------------
# New feature service functions
# ---------------------------------------------------------------------------

async def toggle_star(email_id: str, user_id: str, starred: bool) -> bool:
    """Toggle the starred flag on an email."""
    try:
        supabase = get_supabase()
        supabase.table("emails").update({"starred": starred}).eq(
            "id", email_id
        ).eq("user_id", user_id).execute()
        return True
    except Exception as exc:
        logger.error("toggle_star error (email_id=%s): %s", email_id, exc)
        return False


async def snooze_email(email_id: str, user_id: str, snooze_until) -> bool:
    """Set or clear the snooze_until timestamp on an email."""
    try:
        supabase = get_supabase()
        value = snooze_until.isoformat() if hasattr(snooze_until, "isoformat") else snooze_until
        supabase.table("emails").update({"snooze_until": value}).eq(
            "id", email_id
        ).eq("user_id", user_id).execute()
        return True
    except Exception as exc:
        logger.error("snooze_email error (email_id=%s): %s", email_id, exc)
        return False


async def get_snoozed_emails(user_id: str) -> list[dict]:
    """Return emails that are currently snoozed (snooze_until in the future)."""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("emails")
            .select("*")
            .eq("user_id", user_id)
            .neq("dismissed", True)
            .not_.is_("snooze_until", "null")
            .execute()
        )
        now = datetime.now(timezone.utc)
        snoozed = [
            _normalize_email(r) for r in (result.data or [])
            if r.get("snooze_until") and
            datetime.fromisoformat(r["snooze_until"].replace("Z", "+00:00")) > now
        ]
        return snoozed
    except Exception as exc:
        logger.error("get_snoozed_emails error (user_id=%s): %s", user_id, exc)
        return []


async def bulk_dismiss(user_id: str, email_ids: list[str]) -> int:
    """Set dismissed=true on all given email IDs belonging to the user."""
    if not email_ids:
        return 0
    try:
        supabase = get_supabase()
        result = (
            supabase.table("emails")
            .update({"dismissed": True})
            .eq("user_id", user_id)
            .in_("id", email_ids)
            .execute()
        )
        return len(result.data or [])
    except Exception as exc:
        logger.error("bulk_dismiss error (user_id=%s): %s", user_id, exc)
        return 0


async def bulk_mark_read(user_id: str, email_ids: list[str]) -> int:
    """Set is_read=true on all given email IDs belonging to the user."""
    if not email_ids:
        return 0
    try:
        supabase = get_supabase()
        result = (
            supabase.table("emails")
            .update({"is_read": True})
            .eq("user_id", user_id)
            .in_("id", email_ids)
            .execute()
        )
        return len(result.data or [])
    except Exception as exc:
        logger.error("bulk_mark_read error (user_id=%s): %s", user_id, exc)
        return 0


async def get_export_emails(user_id: str) -> list[dict]:
    """Fetch all non-dismissed emails for CSV export (max 2000)."""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("emails")
            .select("id, subject, sender, received_at, category, priority, ai_summary, is_read, processed")
            .eq("user_id", user_id)
            .neq("dismissed", True)
            .order("received_at", desc=True)
            .limit(2000)
            .execute()
        )
        return result.data or []
    except Exception as exc:
        logger.error("get_export_emails error (user_id=%s): %s", user_id, exc)
        return []


async def get_sender_insights(user_id: str) -> list[dict]:
    """Return top 10 senders by email count with category breakdown."""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("emails")
            .select("sender, received_at, category")
            .eq("user_id", user_id)
            .neq("dismissed", True)
            .execute()
        )
        rows = result.data or []

        sender_map: dict[str, dict] = {}
        for row in rows:
            sender_raw = row.get("sender", "") or ""
            from_name, from_email = _parse_sender(sender_raw)
            key = from_email or sender_raw
            if key not in sender_map:
                sender_map[key] = {
                    "sender_email": from_email or sender_raw,
                    "sender_name": from_name,
                    "count": 0,
                    "last_email_at": "",
                    "categories": {},
                }
            entry = sender_map[key]
            entry["count"] += 1
            received = row.get("received_at", "") or ""
            if received > entry["last_email_at"]:
                entry["last_email_at"] = received
            cat = _CATEGORY_MAP.get(row.get("category") or "", "other")
            entry["categories"][cat] = entry["categories"].get(cat, 0) + 1

        top10 = sorted(sender_map.values(), key=lambda x: x["count"], reverse=True)[:10]
        return top10
    except Exception as exc:
        logger.error("get_sender_insights error (user_id=%s): %s", user_id, exc)
        return []


async def get_follow_up_emails(user_id: str) -> list[dict]:
    """Return processed emails needing follow-up that are older than 2 days."""
    try:
        from datetime import timedelta
        supabase = get_supabase()
        cutoff = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        follow_up_categories = [
            "needs_response", "follow_up", "urgent_client_request", "quote_request",
        ]
        result = (
            supabase.table("emails")
            .select("*")
            .eq("user_id", user_id)
            .eq("processed", True)
            .neq("dismissed", True)
            .in_("category", follow_up_categories)
            .lt("received_at", cutoff)
            .order("received_at", desc=True)
            .limit(10)
            .execute()
        )
        return [_normalize_email(r) for r in (result.data or [])]
    except Exception as exc:
        logger.error("get_follow_up_emails error (user_id=%s): %s", user_id, exc)
        return []
