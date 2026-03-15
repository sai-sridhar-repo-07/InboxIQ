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


async def _process_user_emails(user_id: str) -> None:
    """
    Fetch unread Gmail messages for one user, store new ones in Supabase,
    then queue AI processing.
    """
    # Import here to avoid circular dependency at module load time
    from services.ai_processor import process_email as ai_process

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

            stored = await create_email(email_create)
            if stored:
                # Run AI pipeline asynchronously — don't block the listener
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


def start_email_listener() -> AsyncIOScheduler:
    """
    Register the polling job and start the APScheduler instance.
    Called once during application startup.
    """
    scheduler.add_job(
        poll_all_users,
        trigger="interval",
        minutes=5,
        id="email_listener",
        name="Gmail Email Poller",
        replace_existing=True,
        misfire_grace_time=60,
    )
    scheduler.start()
    logger.info("Email listener scheduler started (every 5 minutes).")
    return scheduler


def stop_email_listener() -> None:
    """Gracefully stop the scheduler on application shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Email listener scheduler stopped.")
