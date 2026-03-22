"""
Background email listener — fetches new Gmail messages for all connected
users on a configurable schedule (default: every 5 minutes).

Intended to be started alongside the FastAPI application via APScheduler.
"""

import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from database import get_supabase
from services.gmail_service import fetch_new_emails
from services.email_service import create_email
from models.email import EmailCreate

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _get_gmail_connected_users() -> list[str]:
    """Return user IDs that currently have Gmail connected."""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("user_profiles")
            .select("id")
            .eq("gmail_connected", True)
            .execute()
        )
        return [row["id"] for row in (result.data or [])]
    except Exception as exc:
        logger.error("Failed to fetch Gmail-connected users: %s", exc)
        return []


async def _sync_user_emails(user_id: str) -> None:
    """
    Fetch unread Gmail messages for one user and store new ones in Supabase.
    Does NOT run AI processing — users trigger that manually per email.
    """
    try:
        raw_emails = await fetch_new_emails(user_id=user_id)
        if not raw_emails:
            return

        logger.info("Fetched %d emails for user_id=%s", len(raw_emails), user_id)

        supabase = get_supabase()

        for raw in raw_emails:
            gmail_message_id = raw.get("gmail_message_id")

            # Skip duplicates already stored
            if gmail_message_id:
                existing = (
                    supabase.table("emails")
                    .select("id")
                    .eq("gmail_message_id", gmail_message_id)
                    .eq("user_id", user_id)
                    .execute()
                )
                if existing.data:
                    continue

            email_create = EmailCreate(
                user_id=user_id,
                subject=raw.get("subject", "(No Subject)"),
                sender=raw.get("sender", ""),
                body=raw.get("body", ""),
                received_at=raw.get("received_at"),
                gmail_message_id=gmail_message_id,
                thread_id=raw.get("thread_id"),
            )

            await create_email(email_create)

    except Exception as exc:
        logger.error("Error syncing emails for user_id=%s: %s", user_id, exc)


async def _process_user_emails(user_id: str) -> None:
    """
    Fetch and store emails, then auto-run AI processing.
    Used by the background poll (poll_all_users) — not triggered by manual sync.
    """
    from services.ai_processor import process_email as ai_process

    try:
        raw_emails = await fetch_new_emails(user_id=user_id)
        if not raw_emails:
            return

        logger.info("Fetched %d emails for user_id=%s", len(raw_emails), user_id)

        supabase = get_supabase()

        for raw in raw_emails:
            gmail_message_id = raw.get("gmail_message_id")

            if gmail_message_id:
                existing = (
                    supabase.table("emails")
                    .select("id")
                    .eq("gmail_message_id", gmail_message_id)
                    .eq("user_id", user_id)
                    .execute()
                )
                if existing.data:
                    continue

            email_create = EmailCreate(
                user_id=user_id,
                subject=raw.get("subject", "(No Subject)"),
                sender=raw.get("sender", ""),
                body=raw.get("body", ""),
                received_at=raw.get("received_at"),
                gmail_message_id=gmail_message_id,
                thread_id=raw.get("thread_id"),
            )

            stored = await create_email(email_create)
            if stored:
                asyncio.create_task(ai_process(stored))

    except Exception as exc:
        logger.error(
            "Error processing emails for user_id=%s: %s", user_id, exc
        )


async def poll_all_users() -> None:
    """
    Poll Gmail for every connected user.  Runs as a scheduled job.
    """
    logger.debug("Email listener poll started.")
    user_ids = await _get_gmail_connected_users()

    if not user_ids:
        logger.debug("No Gmail-connected users found; skipping poll.")
        return

    # Fan out concurrently, capped to avoid hitting rate limits
    semaphore = asyncio.Semaphore(5)

    async def _bounded(uid: str) -> None:
        async with semaphore:
            await _process_user_emails(uid)

    await asyncio.gather(*[_bounded(uid) for uid in user_ids], return_exceptions=True)
    logger.debug("Email listener poll complete (%d users).", len(user_ids))


async def send_deadline_reminders() -> None:
    """Daily job: alert users about overdue or due-in-24h action items via Slack."""
    from services.slack_service import send_slack_notification
    try:
        supabase = get_supabase()
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        tomorrow = now + timedelta(hours=24)

        result = supabase.table("actions").select(
            "id, task, deadline, email_id, emails(user_id)"
        ).eq("status", "pending").not_.is_("deadline", "null").execute()

        user_actions: dict[str, list[dict]] = {}
        for row in (result.data or []):
            try:
                deadline = datetime.fromisoformat(row["deadline"].replace("Z", "+00:00"))
            except Exception:
                continue
            if deadline > tomorrow:
                continue
            user_id = (row.get("emails") or {}).get("user_id")
            if not user_id:
                continue
            user_actions.setdefault(user_id, []).append({
                "task": row["task"],
                "deadline_str": deadline.strftime("%b %d %H:%M UTC"),
                "overdue": deadline < now,
            })

        for user_id, items in user_actions.items():
            try:
                profile = supabase.table("user_profiles").select(
                    "slack_webhook_url"
                ).eq("id", user_id).single().execute()
                webhook_url = (profile.data or {}).get("slack_webhook_url", "").strip()
                if not webhook_url:
                    continue

                overdue = [a for a in items if a["overdue"]]
                upcoming = [a for a in items if not a["overdue"]]
                lines = ["*⏰ Mailair Task Reminder*\n"]
                if overdue:
                    lines.append(f"*🔴 Overdue ({len(overdue)}):*")
                    for a in overdue[:5]:
                        lines.append(f"  • {a['task']} — was due {a['deadline_str']}")
                if upcoming:
                    lines.append(f"*🟡 Due in 24h ({len(upcoming)}):*")
                    for a in upcoming[:5]:
                        lines.append(f"  • {a['task']} — due {a['deadline_str']}")

                await send_slack_notification(webhook_url, "\n".join(lines))
                logger.info("Deadline reminder sent to user %s (%d items)", user_id, len(items))
            except Exception as exc:
                logger.error("Reminder failed for user %s: %s", user_id, exc)
    except Exception as exc:
        logger.error("send_deadline_reminders error: %s", exc)


def start_email_listener() -> AsyncIOScheduler:
    """
    Register the polling job and start the APScheduler instance.
    Called once during application startup.
    """
    from workers.digest_worker import send_daily_digest

    scheduler.add_job(
        poll_all_users,
        trigger="interval",
        minutes=5,
        id="email_listener",
        name="Gmail Email Poller",
        replace_existing=True,
        misfire_grace_time=60,
    )
    scheduler.add_job(
        send_daily_digest,
        trigger="cron",
        hour=8,
        minute=0,
        id="daily_digest",
        name="Daily Email Digest",
        replace_existing=True,
        misfire_grace_time=300,
    )
    scheduler.add_job(
        send_deadline_reminders,
        trigger="cron",
        hour=9,
        minute=0,
        id="deadline_reminders",
        name="Daily Deadline Reminders",
        replace_existing=True,
        misfire_grace_time=300,
    )
    scheduler.start()
    logger.info("Email listener scheduler started (every 5 minutes).")
    return scheduler


def stop_email_listener() -> None:
    """Gracefully stop the scheduler on application shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Email listener scheduler stopped.")
