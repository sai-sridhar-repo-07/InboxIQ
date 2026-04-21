"""
Follow-up Email Sequences.
User defines multi-step sequences; APScheduler fires each step on schedule.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from database import get_supabase
from services.gmail_service import send_gmail_compose

logger = logging.getLogger(__name__)


def list_sequences(user_id: str) -> list[dict]:
    supabase = get_supabase()
    result = supabase.table("follow_up_sequences").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    seqs = result.data or []
    for s in seqs:
        enroll_count = supabase.table("sequence_enrollments").select("id", count="exact").eq("sequence_id", s["id"]).eq("status", "active").execute()
        s["active_enrollments"] = enroll_count.count or 0
    return seqs


def create_sequence(user_id: str, name: str, steps: list[dict]) -> dict:
    """
    steps: [{delay_days: int, subject_template: str, body_template: str}]
    """
    supabase = get_supabase()
    result = supabase.table("follow_up_sequences").insert({
        "user_id": user_id,
        "name": name,
        "steps": steps,
    }).execute()
    return result.data[0] if result.data else {}


def delete_sequence(seq_id: str, user_id: str) -> bool:
    try:
        get_supabase().table("follow_up_sequences").delete().eq("id", seq_id).eq("user_id", user_id).execute()
        return True
    except Exception as exc:
        logger.error("delete_sequence error: %s", exc)
        return False


def enroll_in_sequence(user_id: str, sequence_id: str, contact_email: str, email_id: Optional[str] = None) -> dict:
    """Enroll a contact in a sequence starting from step 0."""
    supabase = get_supabase()
    seq = supabase.table("follow_up_sequences").select("*").eq("id", sequence_id).eq("user_id", user_id).single().execute()
    if not seq.data:
        return {}

    steps = seq.data.get("steps") or []
    if not steps:
        return {}

    first_delay = steps[0].get("delay_days", 1)
    next_send = (datetime.now(timezone.utc) + timedelta(days=first_delay)).isoformat()

    result = supabase.table("sequence_enrollments").insert({
        "user_id": user_id,
        "sequence_id": sequence_id,
        "email_id": email_id,
        "contact_email": contact_email,
        "current_step": 0,
        "next_send_at": next_send,
        "status": "active",
    }).execute()
    return result.data[0] if result.data else {}


def list_enrollments(user_id: str) -> list[dict]:
    supabase = get_supabase()
    result = (
        supabase.table("sequence_enrollments")
        .select("*, follow_up_sequences(name)")
        .eq("user_id", user_id)
        .order("next_send_at", desc=False)
        .limit(50)
        .execute()
    )
    return result.data or []


def cancel_enrollment(enrollment_id: str, user_id: str) -> bool:
    try:
        get_supabase().table("sequence_enrollments").update({"status": "cancelled"}).eq("id", enrollment_id).eq("user_id", user_id).execute()
        return True
    except Exception as exc:
        logger.error("cancel_enrollment error: %s", exc)
        return False


async def flush_sequence_steps() -> None:
    """APScheduler job: send due sequence steps."""
    supabase = get_supabase()
    now = datetime.now(timezone.utc).isoformat()

    pending = (
        supabase.table("sequence_enrollments")
        .select("*")
        .eq("status", "active")
        .lte("next_send_at", now)
        .execute()
    )
    rows = pending.data or []
    logger.info("Sequence flush: %d due steps", len(rows))

    for row in rows:
        try:
            seq = supabase.table("follow_up_sequences").select("*").eq("id", row["sequence_id"]).single().execute()
            if not seq.data:
                continue

            steps = seq.data.get("steps") or []
            current_step = row.get("current_step", 0)
            if current_step >= len(steps):
                supabase.table("sequence_enrollments").update({"status": "completed"}).eq("id", row["id"]).execute()
                continue

            step = steps[current_step]
            subject = step.get("subject_template", "Following up")
            body = step.get("body_template", "Just following up on my previous message.")

            ok = await send_gmail_compose(
                user_id=row["user_id"],
                to=row["contact_email"],
                subject=subject,
                body=body,
            )

            next_step = current_step + 1
            if next_step >= len(steps):
                supabase.table("sequence_enrollments").update({
                    "status": "completed",
                    "current_step": next_step,
                }).eq("id", row["id"]).execute()
            else:
                next_delay = steps[next_step].get("delay_days", 3)
                next_send = (datetime.now(timezone.utc) + timedelta(days=next_delay)).isoformat()
                supabase.table("sequence_enrollments").update({
                    "current_step": next_step,
                    "next_send_at": next_send,
                    "status": "active" if ok else "failed",
                }).eq("id", row["id"]).execute()

        except Exception as exc:
            logger.error("Sequence step error for enrollment %s: %s", row.get("id"), exc)
