"""
Pre-Meeting Brief Generator.
Combines calendar event + email history with attendees to generate a context brief.
"""
import logging
from datetime import datetime, timezone, timedelta

import anthropic

from config import settings
from database import get_supabase

logger = logging.getLogger(__name__)


async def generate_meeting_brief(user_id: str, event: dict) -> dict:
    """
    Generate a pre-meeting brief from calendar event data + email history.

    event: {title, start_time, attendee_emails: [str], description}
    """
    supabase = get_supabase()
    attendee_emails = event.get("attendee_emails") or []
    title = event.get("title", "Meeting")
    start_time = event.get("start_time", "")
    description = event.get("description", "")

    # Pull recent emails with each attendee
    email_context_parts = []
    action_items_context = []

    for attendee_email in attendee_emails[:4]:
        result = (
            supabase.table("emails")
            .select("subject, received_at, ai_summary, category, sender")
            .eq("user_id", user_id)
            .ilike("sender", f"%{attendee_email}%")
            .order("received_at", desc=True)
            .limit(5)
            .execute()
        )
        emails = result.data or []
        if emails:
            snippets = [
                f"  - [{e.get('received_at', '')[:10]}] {e.get('subject', '')} | {e.get('ai_summary', '')[:100]}"
                for e in emails
            ]
            email_context_parts.append(f"Emails with {attendee_email}:\n" + "\n".join(snippets))

        # Pull open action items related to this attendee
        actions = (
            supabase.table("actions")
            .select("title, due_date, status")
            .eq("user_id", user_id)
            .eq("status", "pending")
            .ilike("title", f"%{attendee_email.split('@')[0]}%")
            .limit(3)
            .execute()
        )
        for a in (actions.data or []):
            action_items_context.append(f"  - {a.get('title', '')} (due: {a.get('due_date', 'no date')})")

    email_section = "\n\n".join(email_context_parts) if email_context_parts else "No recent emails found."
    actions_section = "\n".join(action_items_context) if action_items_context else "No open action items."

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    prompt = f"""Generate a concise pre-meeting brief for a service business owner.

Meeting: {title}
Time: {start_time}
Attendees: {', '.join(attendee_emails)}
Description: {description or 'None provided'}

Recent email context:
{email_section}

Open action items:
{actions_section}

Write a structured brief with these sections:
1. **Context** (2-3 sentences: who are these people, what's the relationship)
2. **Last Discussed** (bullet points from recent emails)
3. **Open Items** (what you committed to, what they owe you)
4. **Agenda Suggestions** (2-3 things to cover based on context)
5. **Watch Out For** (any tensions, overdue items, or sensitivities)

Be direct and practical. Skip sections with no relevant info."""

    try:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        brief_text = next((b.text for b in response.content if b.type == "text"), "").strip()
    except Exception as exc:
        logger.error("Brief generation failed: %s", exc)
        brief_text = "Failed to generate brief."

    # Save to DB
    try:
        saved = supabase.table("meeting_briefs").insert({
            "user_id": user_id,
            "meeting_title": title,
            "meeting_time": start_time,
            "attendee_emails": attendee_emails,
            "brief_content": brief_text,
        }).execute()
        brief_id = saved.data[0]["id"] if saved.data else None
    except Exception as exc:
        logger.error("Failed to save brief: %s", exc)
        brief_id = None

    return {
        "id": brief_id,
        "meeting_title": title,
        "meeting_time": start_time,
        "attendee_emails": attendee_emails,
        "brief_content": brief_text,
    }


def list_briefs(user_id: str) -> list[dict]:
    supabase = get_supabase()
    result = (
        supabase.table("meeting_briefs")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return result.data or []
