"""
Knowledge Base from Email.
Extracts decisions, agreements, prices, commitments into a searchable store.
"""
import logging
import json

import anthropic

from config import settings
from database import get_supabase

logger = logging.getLogger(__name__)

ENTRY_TYPES = ["decision", "agreement", "price", "commitment", "deadline", "contact_info", "process"]


async def extract_knowledge_from_email(email_id: str, user_id: str) -> list[dict]:
    """Extract knowledge entries from a single processed email."""
    supabase = get_supabase()
    result = supabase.table("emails").select("*").eq("id", email_id).eq("user_id", user_id).single().execute()
    email = result.data
    if not email or not email.get("processed"):
        return []

    subject = email.get("subject", "") or ""
    body = (email.get("body", "") or "")[:2000]
    sender = email.get("sender", "") or ""

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    prompt = f"""Extract knowledge entries from this business email that would be useful to remember later.

Subject: {subject}
From: {sender}
Body: {body}

Return a JSON array of knowledge entries. Only include concrete, factual, reusable knowledge.

Each entry:
{{
  "entry_type": "decision|agreement|price|commitment|deadline|contact_info|process",
  "title": "short searchable title",
  "content": "the actual knowledge (1-3 sentences)",
  "parties": ["party1", "party2"],
  "tags": ["tag1", "tag2"]
}}

Return [] if no reusable knowledge found. ONLY return valid JSON."""

    try:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        text = next((b.text for b in response.content if b.type == "text"), "[]").strip()
        if not text.startswith("["):
            text = "[]"
        entries_raw = json.loads(text)
    except Exception as exc:
        logger.error("Knowledge extraction failed for email %s: %s", email_id, exc)
        return []

    saved = []
    for entry in entries_raw[:6]:
        try:
            row = supabase.table("knowledge_entries").insert({
                "user_id": user_id,
                "email_id": email_id,
                "entry_type": entry.get("entry_type", "other"),
                "title": entry.get("title", ""),
                "content": entry.get("content", ""),
                "parties": entry.get("parties", []),
                "tags": entry.get("tags", []),
                "sender": sender,
                "subject": subject,
            }).execute()
            if row.data:
                saved.append(row.data[0])
        except Exception as exc:
            logger.error("Failed to save knowledge entry: %s", exc)

    return saved


def search_knowledge(user_id: str, query: str, entry_type: str | None = None) -> list[dict]:
    """Full-text search across knowledge entries."""
    supabase = get_supabase()
    q = (
        supabase.table("knowledge_entries")
        .select("*")
        .eq("user_id", user_id)
        .or_(f"title.ilike.%{query}%,content.ilike.%{query}%,tags.cs.{{\"{query}\"}}")
        .order("created_at", desc=True)
        .limit(30)
    )
    if entry_type:
        q = q.eq("entry_type", entry_type)
    result = q.execute()
    return result.data or []


def list_knowledge(user_id: str, entry_type: str | None = None, limit: int = 50) -> list[dict]:
    supabase = get_supabase()
    q = (
        supabase.table("knowledge_entries")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
    )
    if entry_type:
        q = q.eq("entry_type", entry_type)
    return q.execute().data or []


def delete_knowledge_entry(entry_id: str, user_id: str) -> bool:
    try:
        get_supabase().table("knowledge_entries").delete().eq("id", entry_id).eq("user_id", user_id).execute()
        return True
    except Exception as exc:
        logger.error("delete_knowledge_entry error: %s", exc)
        return False


async def bulk_extract_knowledge(user_id: str, limit: int = 30) -> int:
    """Background job: extract knowledge from recent processed emails not yet scanned."""
    supabase = get_supabase()
    scanned = supabase.table("knowledge_entries").select("email_id").eq("user_id", user_id).execute()
    scanned_ids = {r["email_id"] for r in (scanned.data or [])}

    result = (
        supabase.table("emails")
        .select("id")
        .eq("user_id", user_id)
        .eq("processed", True)
        .neq("dismissed", True)
        .not_.in_("category", ["newsletter", "spam", "fyi"])
        .order("received_at", desc=True)
        .limit(limit)
        .execute()
    )
    emails = [r for r in (result.data or []) if r["id"] not in scanned_ids]

    count = 0
    for email in emails[:15]:
        entries = await extract_knowledge_from_email(email["id"], user_id)
        count += len(entries)
    return count
