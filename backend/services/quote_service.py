"""
Quote / Invoice Drafter from Email.
AI extracts scope from email thread, generates a structured quote.
"""
import logging
import json

import anthropic

from config import settings
from database import get_supabase

logger = logging.getLogger(__name__)


async def generate_quote_from_email(email_id: str, user_id: str) -> dict:
    """Extract scope from email thread and generate a draft quote."""
    supabase = get_supabase()
    result = supabase.table("emails").select("*").eq("id", email_id).eq("user_id", user_id).single().execute()
    email = result.data
    if not email:
        return {}

    subject = email.get("subject", "") or ""
    body = (email.get("body", "") or "")[:3000]
    sender = email.get("sender", "") or ""

    # Parse client name/email
    client_name = sender.split("<")[0].strip().strip('"') if "<" in sender else sender
    client_email = sender.split("<")[-1].strip(">").strip() if "<" in sender else sender

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    prompt = f"""A client sent this email. Generate a professional quote/proposal structure.

Subject: {subject}
From: {sender}
Email: {body}

Return JSON:
{{
  "project_title": "descriptive project name",
  "client_name": "{client_name}",
  "client_email": "{client_email}",
  "scope_summary": "2-3 sentence summary of what the client needs",
  "line_items": [
    {{"description": "item description", "quantity": 1, "unit_price": 0, "unit": "fixed|hour|day"}}
  ],
  "notes": "any assumptions, exclusions, or important notes",
  "payment_terms": "50% upfront, 50% on delivery",
  "validity_days": 14
}}

For unit_price: estimate reasonable market rates in INR. Leave as 0 if unclear.
Return ONLY valid JSON."""

    try:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = next((b.text for b in response.content if b.type == "text"), "{}").strip()
        if text.startswith("```"):
            text = text.split("```")[1].lstrip("json").strip()
        quote_data = json.loads(text)
    except Exception as exc:
        logger.error("Quote generation failed: %s", exc)
        return {}

    # Compute totals
    line_items = quote_data.get("line_items") or []
    subtotal = sum((item.get("quantity") or 1) * (item.get("unit_price") or 0) for item in line_items)
    tax = int(subtotal * 0.18)
    total = subtotal + tax

    quote_data.update({
        "email_id": email_id,
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "currency": "INR",
        "status": "draft",
        "subject": subject,
    })

    # Save
    try:
        saved = supabase.table("quotes").insert({
            "user_id": user_id,
            "email_id": email_id,
            "project_title": quote_data.get("project_title", "Project Quote"),
            "client_name": quote_data.get("client_name", ""),
            "client_email": quote_data.get("client_email", ""),
            "scope_summary": quote_data.get("scope_summary", ""),
            "line_items": line_items,
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
            "currency": "INR",
            "notes": quote_data.get("notes", ""),
            "payment_terms": quote_data.get("payment_terms", ""),
            "validity_days": quote_data.get("validity_days", 14),
            "status": "draft",
        }).execute()
        if saved.data:
            quote_data["id"] = saved.data[0]["id"]
    except Exception as exc:
        logger.error("Failed to save quote: %s", exc)

    return quote_data


def list_quotes(user_id: str) -> list[dict]:
    supabase = get_supabase()
    result = (
        supabase.table("quotes")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return result.data or []


def update_quote_status(quote_id: str, user_id: str, status: str) -> bool:
    try:
        get_supabase().table("quotes").update({"status": status}).eq("id", quote_id).eq("user_id", user_id).execute()
        return True
    except Exception as exc:
        logger.error("update_quote_status error: %s", exc)
        return False
