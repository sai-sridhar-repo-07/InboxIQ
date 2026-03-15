"""
Embedding module — disabled in production to reduce memory usage.
Semantic similarity search is skipped; AI reply generation still works
using Claude directly without past-reply context.
"""
import logging

logger = logging.getLogger(__name__)


async def generate_embedding(text: str) -> list[float]:
    return []


async def store_reply_embedding(user_id: str, email_id: str, reply_text: str) -> None:
    logger.debug("Embeddings disabled — skipping store for email_id=%s", email_id)


async def find_similar_replies(
    user_id: str, email_text: str, limit: int = 3
) -> list[str]:
    return []
