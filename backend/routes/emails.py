import csv
import io
import logging
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from database import get_supabase
from middleware.auth import get_current_user
from models.email import EmailFilter, EmailResponse
from services import email_service
from services.ai_processor import process_email
from services.gmail_service import send_gmail_reply, get_email_attachments, get_attachment_data
from services.stripe_service import PLAN_LIMITS
from workers.email_listener import _process_user_emails

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/emails", tags=["emails"])


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _current_user_id(current_user: dict) -> str:
    return current_user["id"]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("", response_model=dict)
async def list_emails(
    current_user: Annotated[dict, Depends(get_current_user)],
    category: str | None = Query(None),
    priority_level: str | None = Query(None),
    min_priority: int | None = Query(None, ge=1, le=10),
    is_read: bool | None = Query(None),
    processed: bool | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort_by: str | None = Query(None),
    sort_order: str | None = Query(None),
):
    """List emails for the authenticated user with optional filters."""
    offset = (page - 1) * page_size
    filters = EmailFilter(
        category=category,
        min_priority=min_priority,
        processed=processed,
        limit=page_size,
        offset=offset,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    items = await email_service.get_emails(
        user_id=_current_user_id(current_user), filters=filters
    )
    total = await email_service.count_emails(
        user_id=_current_user_id(current_user), filters=filters
    )
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/analytics")
async def email_analytics(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return analytics data for charts."""
    return await email_service.get_analytics(user_id=_current_user_id(current_user))


async def _get_emails_used_this_month(user_id: str) -> int:
    from datetime import timezone
    supabase = get_supabase()
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    result = (
        supabase.table("emails")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", month_start)
        .execute()
    )
    return result.count or 0


async def _get_user_plan(user_id: str) -> str:
    supabase = get_supabase()
    result = supabase.table("user_profiles").select("plan").eq("id", user_id).single().execute()
    return (result.data or {}).get("plan", "free")


@router.post("/bulk-process", status_code=status.HTTP_202_ACCEPTED)
async def bulk_process_emails(
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Queue AI processing for all unprocessed emails, respecting plan limits."""
    user_id = _current_user_id(current_user)
    plan = await _get_user_plan(user_id)
    limit = PLAN_LIMITS.get(plan)  # None = unlimited

    email_ids = await email_service.get_unprocessed_email_ids(user_id=user_id)

    if limit is not None:
        used = await _get_emails_used_this_month(user_id)
        remaining = max(0, limit - used)
        email_ids = email_ids[:remaining]
        if not email_ids:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Monthly limit of {limit} emails reached. Upgrade to Pro for unlimited processing.",
            )

    for email_id in email_ids:
        email = await email_service.get_email(email_id=email_id, user_id=user_id)
        if email:
            background_tasks.add_task(process_email, email)
    return {"message": f"Queued {len(email_ids)} emails for AI processing.", "count": len(email_ids)}


@router.patch("/{email_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_as_read(
    email_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Mark an email as read."""
    await email_service.mark_email_read(email_id=email_id, user_id=_current_user_id(current_user))
    return None


@router.get("/stats")
async def email_stats(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return aggregate email statistics for the current user."""
    return await email_service.get_email_stats(
        user_id=_current_user_id(current_user)
    )


@router.get("/priority-inbox")
async def priority_inbox(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return emails organised into urgent / important / other sections."""
    return await email_service.get_priority_inbox(
        user_id=_current_user_id(current_user)
    )


@router.post("/sync", status_code=status.HTTP_202_ACCEPTED)
async def sync_emails(
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Manually trigger a Gmail sync for the current user."""
    background_tasks.add_task(_process_user_emails, _current_user_id(current_user))
    return {"message": "Gmail sync started."}


# ---------------------------------------------------------------------------
# New feature models
# ---------------------------------------------------------------------------

class StarBody(BaseModel):
    starred: bool


class SnoozeBody(BaseModel):
    snooze_until: datetime | None = None


class BulkEmailIds(BaseModel):
    email_ids: list[str]


class QuoteRequest(BaseModel):
    project_description: str | None = None
    budget_hint: str | None = None


# ---------------------------------------------------------------------------
# New feature routes (must be before /{email_id} catch-all)
# ---------------------------------------------------------------------------

@router.patch("/{email_id}/star", status_code=status.HTTP_204_NO_CONTENT)
async def star_email(
    email_id: str,
    body: StarBody,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Toggle the starred flag on an email."""
    await email_service.toggle_star(
        email_id=email_id,
        user_id=_current_user_id(current_user),
        starred=body.starred,
    )
    return None


@router.patch("/{email_id}/snooze", status_code=status.HTTP_204_NO_CONTENT)
async def snooze_email(
    email_id: str,
    body: SnoozeBody,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Set or clear the snooze_until timestamp on an email."""
    await email_service.snooze_email(
        email_id=email_id,
        user_id=_current_user_id(current_user),
        snooze_until=body.snooze_until,
    )
    return None


@router.post("/inbox-zero", response_model=dict)
async def inbox_zero(current_user: Annotated[dict, Depends(get_current_user)]):
    """Dismiss newsletters, spam, and low-priority FYI emails to reach Inbox Zero."""
    result = await email_service.inbox_zero(user_id=_current_user_id(current_user))
    return result


@router.post("/bulk-summarize", response_model=list)
async def bulk_summarize(
    body: BulkEmailIds,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Generate AI summaries for multiple emails (cap 10)."""
    summaries = await email_service.bulk_summarize(
        user_id=_current_user_id(current_user), email_ids=body.email_ids
    )
    return summaries


@router.get("/snoozed")
async def get_snoozed_emails(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return emails that are currently snoozed (snooze_until in the future)."""
    return await email_service.get_snoozed_emails(user_id=_current_user_id(current_user))


@router.post("/bulk-dismiss")
async def bulk_dismiss(
    body: BulkEmailIds,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Set dismissed=true on all given email IDs."""
    count = await email_service.bulk_dismiss(
        user_id=_current_user_id(current_user), email_ids=body.email_ids
    )
    return {"dismissed": count}


@router.post("/bulk-read")
async def bulk_mark_read(
    body: BulkEmailIds,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Set is_read=true on all given email IDs."""
    count = await email_service.bulk_mark_read(
        user_id=_current_user_id(current_user), email_ids=body.email_ids
    )
    return {"updated": count}


@router.get("/export")
async def export_emails_csv(current_user: Annotated[dict, Depends(get_current_user)]):
    """Export all non-dismissed emails as a CSV file."""
    rows = await email_service.get_export_emails(user_id=_current_user_id(current_user))

    output = io.StringIO()
    fieldnames = ["id", "subject", "sender", "received_at", "category", "priority",
                  "ai_summary", "is_read", "processed"]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="emails.csv"'},
    )


@router.get("/sender-insights")
async def sender_insights(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return top 10 senders by email count with category breakdown."""
    return await email_service.get_sender_insights(user_id=_current_user_id(current_user))


@router.get("/follow-ups")
async def follow_ups(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return processed emails needing follow-up older than 2 days."""
    return await email_service.get_follow_up_emails(user_id=_current_user_id(current_user))


@router.get("/response-time", response_model=dict)
async def get_response_time_analytics(current_user: Annotated[dict, Depends(get_current_user)]):
    """Returns avg response time (hours) per category + 30-day daily trend."""
    try:
        from datetime import datetime, timezone
        supabase = get_supabase()
        user_id = _current_user_id(current_user)

        result = supabase.table("emails").select(
            "id, received_at, category, reply_drafts(created_at)"
        ).eq("user_id", user_id).execute()

        rows = result.data or []
        by_category: dict[str, list[float]] = {}
        daily: dict[str, list[float]] = {}
        all_times: list[float] = []

        for row in rows:
            drafts = row.get("reply_drafts") or []
            if not drafts:
                continue
            received = row.get("received_at")
            first_draft = drafts[0].get("created_at") if isinstance(drafts, list) else None
            if not received or not first_draft:
                continue
            try:
                t_recv = datetime.fromisoformat(received.replace("Z", "+00:00"))
                t_draft = datetime.fromisoformat(first_draft.replace("Z", "+00:00"))
                delta_h = (t_draft - t_recv).total_seconds() / 3600
                if delta_h < 0 or delta_h > 720:
                    continue
                all_times.append(delta_h)
                cat = row.get("category") or "other"
                by_category.setdefault(cat, []).append(delta_h)
                day = t_recv.strftime("%Y-%m-%d")
                daily.setdefault(day, []).append(delta_h)
            except Exception:
                continue

        def avg(lst: list[float]) -> float:
            return round(sum(lst) / len(lst), 2) if lst else 0.0

        return {
            "overall_avg_hours": avg(all_times),
            "by_category": {k: avg(v) for k, v in by_category.items()},
            "daily_trend": [
                {"day": d, "avg_hours": avg(v)}
                for d, v in sorted(daily.items())[-30:]
            ],
            "total_replied": len(all_times),
        }
    except Exception as exc:
        logger.error("response_time_analytics error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to get response time analytics.")


@router.post("/{email_id}/generate-quote", response_model=dict)
async def generate_quote(
    email_id: str,
    body: QuoteRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Generate a structured project quote/proposal for a quote_request email."""
    try:
        supabase = get_supabase()
        user_id = _current_user_id(current_user)

        email = supabase.table("emails").select(
            "id, subject, sender, body, category, user_id"
        ).eq("id", email_id).eq("user_id", user_id).single().execute()

        if not email.data:
            raise HTTPException(status_code=404, detail="Email not found.")

        e = email.data

        # Get company description from user profile
        profile = supabase.table("user_profiles").select(
            "company_description"
        ).eq("id", user_id).single().execute()
        company_description = (profile.data or {}).get("company_description", "a professional service business")

        from ai.classifier import client as ai_client

        quote_prompt = f"""You are a professional business consultant helping generate a project quote/proposal.

Business: {company_description}

Client Request Email:
Subject: {e.get('subject', '')}
From: {e.get('sender', '')}
Body: {e.get('body', '')[:2000]}

{f"Additional context: {body.project_description}" if body.project_description else ""}
{f"Budget hint: {body.budget_hint}" if body.budget_hint else ""}

Generate a professional project quote. Return ONLY a JSON object with these fields:
- project_title: string (short project name)
- project_description: string (2-3 sentence description of what will be delivered)
- deliverables: array of strings (3-6 specific deliverables)
- timeline: string (e.g. "2-3 weeks")
- price_estimate: string (e.g. "$500 - $800" or "Custom pricing based on scope")
- payment_terms: string (e.g. "50% upfront, 50% on delivery")
- validity: string (e.g. "This quote is valid for 30 days")
- notes: string (any important notes or assumptions)"""

        response = await ai_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=800,
            messages=[{"role": "user", "content": quote_prompt}],
        )

        text = next((b.text for b in response.content if b.type == "text"), None)
        if not text:
            raise ValueError("No response from AI")

        raw = text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        import json
        quote = json.loads(raw)
        return {"quote": quote, "email_id": email_id}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("generate_quote error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to generate quote.")


@router.get("/{email_id}/meeting-info", response_model=dict)
async def detect_meeting_info(
    email_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Detect if email contains a meeting request and extract meeting details."""
    try:
        supabase = get_supabase()
        user_id = _current_user_id(current_user)

        email = supabase.table("emails").select(
            "id, subject, sender, body"
        ).eq("id", email_id).eq("user_id", user_id).single().execute()

        if not email.data:
            raise HTTPException(status_code=404, detail="Email not found.")

        e = email.data

        from ai.classifier import client as ai_client
        import json

        detect_prompt = f"""Analyze this email and determine if it contains a meeting request.

Email Subject: {e.get('subject', '')}
From: {e.get('sender', '')}
Body: {e.get('body', '')[:1500]}

Return ONLY a JSON object with these fields:
- is_meeting_request: boolean
- meeting_type: string or null ("call", "video", "in_person", "demo", "interview", "other")
- proposed_times: array of strings (any specific times mentioned, e.g. ["Monday 2pm", "Tuesday morning"])
- duration_hint: string or null (e.g. "30 minutes", "1 hour")
- agenda: string or null (what the meeting is about, 1 sentence)
- suggested_reply_snippet: string or null (a brief suggested reply to confirm the meeting, 2-3 sentences)"""

        response = await ai_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=400,
            messages=[{"role": "user", "content": detect_prompt}],
        )

        text = next((b.text for b in response.content if b.type == "text"), None)
        raw = (text or "{}").strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        result = json.loads(raw.strip())
        return result

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("detect_meeting_info error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to detect meeting info.")


@router.get("/{email_id}/thread-summary", response_model=dict)
async def get_thread_summary(
    email_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Generate an AI summary of the entire email thread."""
    try:
        import json
        supabase = get_supabase()
        user_id = _current_user_id(current_user)

        # Get the email and its thread ID
        email_row = supabase.table("emails").select(
            "id, subject, sender, gmail_thread_id"
        ).eq("id", email_id).eq("user_id", user_id).single().execute()

        if not email_row.data:
            raise HTTPException(status_code=404, detail="Email not found.")

        thread_id = email_row.data.get("gmail_thread_id") or email_id

        # Fetch all emails in the thread
        thread_rows = supabase.table("emails").select(
            "id, subject, sender, body, received_at"
        ).eq("user_id", user_id).eq("gmail_thread_id", thread_id).order(
            "received_at", desc=False
        ).limit(20).execute()

        emails_in_thread = thread_rows.data or [email_row.data]

        if len(emails_in_thread) <= 1:
            return {
                "thread_length": 1,
                "summary": None,
                "key_points": [],
                "status": "single_email",
            }

        # Build thread text for AI
        thread_text = ""
        for idx, e in enumerate(emails_in_thread, 1):
            received = e.get("received_at", "")[:10] if e.get("received_at") else ""
            thread_text += f"\n--- Email {idx} ({received}) from {e.get('sender', 'Unknown')} ---\n"
            thread_text += f"Subject: {e.get('subject', '')}\n"
            thread_text += (e.get("body") or "")[:600]
            thread_text += "\n"

        from ai.classifier import client as ai_client

        prompt = f"""You are summarizing an email thread for a busy professional.

Thread ({len(emails_in_thread)} emails):
{thread_text[:4000]}

Return ONLY a JSON object with:
- summary: string (2-3 sentence overview of the full conversation)
- key_points: array of strings (3-5 key points or decisions from the thread)
- next_action: string or null (what action is needed, if any)
- sentiment: one of "positive", "neutral", "negative", "mixed"
"""

        response = await ai_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )

        text = next((b.text for b in response.content if b.type == "text"), None)
        raw = (text or "{}").strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        result = json.loads(raw.strip())
        result["thread_length"] = len(emails_in_thread)
        result["status"] = "summarized"
        return result

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("thread_summary error: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to generate thread summary.")


@router.get("/{email_id}")
async def get_email(
    email_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Retrieve a single email by ID."""
    email = await email_service.get_email(
        email_id=email_id, user_id=_current_user_id(current_user)
    )
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found.",
        )
    return email


@router.post("/{email_id}/process", status_code=status.HTTP_202_ACCEPTED)
async def trigger_ai_processing(
    email_id: str,
    background_tasks: BackgroundTasks,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Manually trigger AI processing for a specific email."""
    user_id = _current_user_id(current_user)

    plan = await _get_user_plan(user_id)
    limit = PLAN_LIMITS.get(plan)
    if limit is not None:
        used = await _get_emails_used_this_month(user_id)
        if used >= limit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Monthly limit of {limit} emails reached. Upgrade to Pro for unlimited processing.",
            )

    email = await email_service.get_email(email_id=email_id, user_id=user_id)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found.",
        )

    background_tasks.add_task(process_email, email)
    return {"message": "AI processing queued.", "email_id": email_id}


@router.delete("/{email_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_email(
    email_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Delete an email."""
    success = await email_service.delete_email(
        email_id=email_id, user_id=_current_user_id(current_user)
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Email {email_id} not found or already deleted.",
        )
    return None


# ---------------------------------------------------------------------------
# Reply draft sub-routes (frontend calls /api/emails/{id}/reply-draft)
# ---------------------------------------------------------------------------

class ReplyDraftUpdate(BaseModel):
    draft_content: str


class SendReplyBody(BaseModel):
    content: str


class GenerateReplyBody(BaseModel):
    instructions: str


@router.get("/{email_id}/reply-draft")
async def get_email_reply_draft(
    email_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Get the AI reply draft for an email."""
    user_id = _current_user_id(current_user)
    email = await email_service.get_email(email_id=email_id, user_id=user_id)
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")

    supabase = get_supabase()
    result = (
        supabase.table("reply_drafts")
        .select("*")
        .eq("email_id", email_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No reply draft found for this email.",
        )
    draft = result.data
    return {
        **draft,
        "draft_content": draft.get("draft_text", ""),
        "confidence_score": draft.get("confidence", 0.0),
        "tone": "professional",
        "is_sent": draft.get("sent", False),
    }


@router.patch("/{email_id}/reply-draft")
async def update_email_reply_draft(
    email_id: str,
    body: ReplyDraftUpdate,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Update the reply draft content for an email."""
    user_id = _current_user_id(current_user)
    email = await email_service.get_email(email_id=email_id, user_id=user_id)
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")

    supabase = get_supabase()
    result = (
        supabase.table("reply_drafts")
        .update({"draft_text": body.draft_content})
        .eq("email_id", email_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reply draft not found.")
    draft = result.data[0]
    return {**draft, "draft_content": draft.get("draft_text", ""), "is_sent": draft.get("sent", False)}


@router.post("/{email_id}/send-reply")
async def send_email_reply(
    email_id: str,
    body: SendReplyBody,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Send a reply to an email via Gmail."""
    user_id = _current_user_id(current_user)
    email = await email_service.get_email(email_id=email_id, user_id=user_id)
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")

    success = await send_gmail_reply(
        user_id=user_id,
        thread_id=email.get("thread_id") or email.get("gmail_thread_id") or "",
        to=email.get("sender") or email.get("from_email", ""),
        subject=email.get("subject", ""),
        body=body.content,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send reply via Gmail.",
        )

    # Mark draft as sent
    supabase = get_supabase()
    try:
        supabase.table("reply_drafts").update({"sent": True}).eq("email_id", email_id).execute()
    except Exception as exc:
        logger.warning("Could not mark reply_draft as sent for email %s: %s", email_id, exc)

    return {"success": True, "message": "Reply sent successfully."}


@router.get("/{email_id}/attachments")
async def list_email_attachments(
    email_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """List attachments for an email."""
    user_id = _current_user_id(current_user)
    email = await email_service.get_email(email_id=email_id, user_id=user_id)
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")
    gmail_message_id = email.get("gmail_message_id")
    if not gmail_message_id:
        return []
    return await get_email_attachments(user_id=user_id, gmail_message_id=gmail_message_id)


@router.get("/{email_id}/attachments/{attachment_id}/download")
async def download_attachment(
    email_id: str,
    attachment_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    filename: str = Query("attachment"),
    mime_type: str = Query("application/octet-stream"),
):
    """Download a Gmail attachment proxied through the backend."""
    user_id = _current_user_id(current_user)
    email = await email_service.get_email(email_id=email_id, user_id=user_id)
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")
    gmail_message_id = email.get("gmail_message_id")
    if not gmail_message_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No Gmail message ID.")
    data = await get_attachment_data(
        user_id=user_id, gmail_message_id=gmail_message_id, attachment_id=attachment_id
    )
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found.")
    return Response(
        content=data,
        media_type=mime_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{email_id}/generate-reply")
async def generate_reply_with_instructions(
    email_id: str,
    body: GenerateReplyBody,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Generate a new AI reply draft based on user instructions."""
    from ai.reply_generator import generate_reply
    from ai.embeddings import find_similar_replies

    user_id = _current_user_id(current_user)
    email = await email_service.get_email(email_id=email_id, user_id=user_id)
    if not email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")

    # Fetch user profile for tone/company context
    supabase = get_supabase()
    company_description = "a professional service business"
    tone = "professional and friendly"
    try:
        profile = supabase.table("user_profiles").select(
            "company_description, tone_preference"
        ).eq("id", user_id).single().execute()
        if profile.data:
            company_description = profile.data.get("company_description") or company_description
            tone = profile.data.get("tone_preference") or tone
    except Exception:
        pass

    draft_text, confidence = await generate_reply(
        subject=email.get("subject", ""),
        sender=email.get("sender") or email.get("from_email", ""),
        body=email.get("body") or email.get("body_text", ""),
        company_description=company_description,
        tone=tone,
        user_instructions=body.instructions,
    )

    # Upsert the new draft
    supabase.table("reply_drafts").upsert(
        {
            "email_id": email_id,
            "user_id": user_id,
            "draft_text": draft_text,
            "confidence": confidence,
        },
        on_conflict="email_id",
    ).execute()

    return {
        "draft_content": draft_text,
        "confidence_score": confidence,
        "tone": tone,
        "is_sent": False,
    }
