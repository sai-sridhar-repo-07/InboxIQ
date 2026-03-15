"""
AI processor worker — provides the background-task entry point that the
FastAPI application and the email listener use to run the full AI pipeline
without blocking request handlers.
"""

import asyncio
import logging

logger = logging.getLogger(__name__)


async def run_ai_pipeline(email: dict) -> None:
    """
    Entry point for processing a single email through the complete AI
    pipeline.

    This function is designed to be called via:
      - FastAPI BackgroundTasks.add_task(run_ai_pipeline, email)
      - asyncio.create_task(run_ai_pipeline(email))

    It delegates to services.ai_processor.process_email which handles
    classification, reply generation, action item extraction, embedding
    storage, and Slack alerts.
    """
    from services.ai_processor import process_email

    email_id = email.get("id", "unknown")
    user_id = email.get("user_id", "unknown")

    logger.info(
        "AI pipeline worker started — email_id=%s user_id=%s", email_id, user_id
    )

    try:
        result = await process_email(email)
        if result:
            logger.info(
                "AI pipeline complete — email_id=%s category=%s priority=%s",
                email_id,
                result.get("category"),
                result.get("priority"),
            )
        else:
            logger.warning("AI pipeline returned no result for email_id=%s", email_id)
    except Exception as exc:
        logger.error(
            "Unhandled error in AI pipeline worker (email_id=%s): %s",
            email_id,
            exc,
            exc_info=True,
        )


async def run_batch_pipeline(emails: list[dict], concurrency: int = 3) -> None:
    """
    Process a batch of emails concurrently with a concurrency cap to avoid
    overwhelming the OpenAI rate limits.

    Parameters
    ----------
    emails:      List of email dicts (must include ``id`` and ``user_id``).
    concurrency: Maximum number of emails processed simultaneously.
    """
    semaphore = asyncio.Semaphore(concurrency)

    async def _bounded(email: dict) -> None:
        async with semaphore:
            await run_ai_pipeline(email)

    await asyncio.gather(
        *[_bounded(email) for email in emails], return_exceptions=True
    )
    logger.info("Batch AI pipeline complete (%d emails).", len(emails))
