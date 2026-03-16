"""
Context-aware reply retrieval using past sent replies as RAG context.
Uses keyword-based search on past sent reply_drafts to find relevant examples.
"""
import logging

logger = logging.getLogger(__name__)


async def generate_embedding(text: str) -> list[float]:
    """Stub — pgvector not enabled. Returns empty list."""
    return []


async def store_reply_embedding(user_id: str, email_id: str, reply_text: str) -> None:
    """Stub — mark reply draft as stored (no-op for pgvector)."""
    logger.debug("Embeddings stub — skipping vector store for email_id=%s", email_id)


async def find_similar_replies(
    user_id: str, email_text: str, limit: int = 3
) -> list[str]:
    """
    Find relevant past replies by fetching the user's most recently sent
    reply drafts. Used as few-shot context for the AI reply generator.
    """
    try:
        from database import get_supabase
        supabase = get_supabase()

        # Get recently sent reply drafts (last 10, pick top `limit`)
        result = (
            supabase.table("reply_drafts")
            .select("draft_text, emails(subject, sender)")
            .eq("user_id", user_id)
            .eq("is_sent", True)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        rows = result.data or []
        if not rows:
            # Fall back to any drafts (not necessarily sent) as style reference
            fallback = (
                supabase.table("reply_drafts")
                .select("draft_text")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return [r["draft_text"] for r in (fallback.data or []) if r.get("draft_text")][:limit]

        # Score by keyword overlap with email_text
        keywords = set(w.lower() for w in email_text.split() if len(w) > 4)
        scored: list[tuple[float, str]] = []
        for row in rows:
            draft = row.get("draft_text", "")
            if not draft:
                continue
            email_meta = row.get("emails") or {}
            context = f"{email_meta.get('subject', '')} {email_meta.get('sender', '')}"
            overlap = sum(1 for w in context.lower().split() if w in keywords)
            scored.append((overlap, draft))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [text for _, text in scored[:limit]]

    except Exception as exc:
        logger.warning("find_similar_replies error: %s", exc)
        return []
