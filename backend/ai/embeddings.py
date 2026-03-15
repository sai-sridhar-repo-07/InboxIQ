"""
Embedding module using sentence-transformers (all-MiniLM-L6-v2, 384 dims).
Completely free — no API key required, runs locally.
"""
import asyncio
import logging
from functools import lru_cache

from database import get_supabase

logger = logging.getLogger(__name__)

# Lazy-load the model on first use to avoid slowing down startup
@lru_cache(maxsize=1)
def _get_model():
    from sentence_transformers import SentenceTransformer  # noqa: PLC0415
    logger.info("Loading sentence-transformer model (all-MiniLM-L6-v2)…")
    return SentenceTransformer("all-MiniLM-L6-v2")


async def generate_embedding(text: str) -> list[float]:
    """
    Generate a 384-dimensional embedding vector.
    Runs the CPU-bound encoding in a thread to keep the async loop free.
    """
    try:
        loop = asyncio.get_event_loop()
        model = await loop.run_in_executor(None, _get_model)
        vector = await loop.run_in_executor(
            None, lambda: model.encode(text[:4000], normalize_embeddings=True).tolist()
        )
        return vector
    except Exception as exc:
        logger.error("Embedding generation error: %s", exc)
        return []


async def store_reply_embedding(user_id: str, email_id: str, reply_text: str) -> None:
    """Persist a reply embedding in the Supabase pgvector table."""
    try:
        embedding = await generate_embedding(reply_text)
        if not embedding:
            logger.warning(
                "Empty embedding returned for email_id=%s; skipping store.", email_id
            )
            return

        supabase = get_supabase()
        supabase.table("reply_embeddings").insert(
            {
                "user_id": user_id,
                "email_id": email_id,
                "reply_text": reply_text[:1000],
                "embedding": embedding,
            }
        ).execute()
        logger.debug("Stored reply embedding for email_id=%s", email_id)

    except Exception as exc:
        logger.error("Error storing reply embedding (email_id=%s): %s", email_id, exc)


async def find_similar_replies(
    user_id: str, email_text: str, limit: int = 3
) -> list[str]:
    """
    Find the most similar past replies for a given user via pgvector cosine
    similarity search.
    """
    try:
        embedding = await generate_embedding(email_text)
        if not embedding:
            return []

        supabase = get_supabase()
        result = supabase.rpc(
            "match_reply_embeddings",
            {
                "query_embedding": embedding,
                "match_user_id": user_id,
                "match_count": limit,
            },
        ).execute()

        if result.data:
            return [r["reply_text"] for r in result.data]
        return []

    except Exception as exc:
        logger.error(
            "Error finding similar replies (user_id=%s): %s", user_id, exc
        )
        return []
