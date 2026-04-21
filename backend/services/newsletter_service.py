import logging
import httpx
import secrets
from datetime import datetime, timezone
from typing import Optional

import anthropic

from config import settings
from database import get_supabase

logger = logging.getLogger(__name__)

RESEND_API = "https://api.resend.com/emails"
HN_TOP_STORIES = "https://hacker-news.firebaseio.com/v0/topstories.json"
HN_ITEM = "https://hacker-news.firebaseio.com/v0/item/{}.json"

AI_KEYWORDS = {
    "ai", "llm", "gpt", "claude", "gemini", "openai", "anthropic", "machine learning",
    "deep learning", "neural", "transformer", "diffusion", "generative", "chatbot",
    "agents", "rag", "embedding", "mistral", "llama", "model", "inference",
    "fine-tuning", "alignment", "benchmark", "multimodal",
}


# ─── Content Generation ───────────────────────────────────────────────────────

async def _fetch_ai_stories(limit: int = 8) -> list[dict]:
    """Fetch top AI/ML stories from Hacker News."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            top_ids_resp = await client.get(HN_TOP_STORIES)
            top_ids = top_ids_resp.json()[:100]

            stories = []
            for story_id in top_ids:
                if len(stories) >= limit:
                    break
                try:
                    item_resp = await client.get(HN_ITEM.format(story_id))
                    item = item_resp.json()
                    if item.get("type") != "story" or not item.get("url"):
                        continue
                    title = (item.get("title") or "").lower()
                    if any(kw in title for kw in AI_KEYWORDS):
                        stories.append({
                            "title": item.get("title", ""),
                            "url": item.get("url", ""),
                            "score": item.get("score", 0),
                            "by": item.get("by", ""),
                            "comments": item.get("descendants", 0),
                        })
                except Exception:
                    continue
        return stories
    except Exception as exc:
        logger.error("fetch_ai_stories error: %s", exc)
        return []


async def generate_newsletter_html(week_label: str) -> str:
    """Use Claude to write a polished newsletter from HN AI stories."""
    stories = await _fetch_ai_stories(limit=8)

    if not stories:
        stories_text = "No stories fetched — generating from general AI knowledge."
    else:
        stories_text = "\n".join(
            f"- {s['title']} ({s['url']}) — {s['score']} points"
            for s in stories
        )

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""You are writing the weekly "AI Pulse" newsletter for Mailair users — busy service business owners who want a quick, punchy digest of what happened in AI this week.

Week: {week_label}

Top AI stories from the community this week:
{stories_text}

Write a concise HTML email newsletter with:
1. A short intro (2 sentences max) — what was the defining theme this week?
2. 3-5 story highlights — for each: bold headline, 2-sentence plain-English explanation of why it matters for business owners, link preserved
3. A "Quick Take" section — 2-3 bullet points of actionable insight (what business owners should do/watch)
4. A punchy sign-off

Format as clean HTML (no <html>/<body> wrapper — just inner content divs/p/ul tags).
Use inline styles. Dark background friendly. Keep it scannable — this is email, not a blog post.
Max 500 words total."""

    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )
    content = next((b.text for b in response.content if b.type == "text"), "").strip()
    return content, stories


def _wrap_newsletter_html(body_html: str, week_label: str, unsubscribe_url: str) -> str:
    """Wrap generated body in full branded email template."""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Pulse — {week_label}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);padding:8px 20px;border-radius:999px;margin-bottom:16px;">
        <span style="color:white;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">AI Pulse by Mailair</span>
      </div>
      <h1 style="color:white;font-size:28px;font-weight:800;margin:0 0 8px;">{week_label}</h1>
      <p style="color:#94a3b8;font-size:14px;margin:0;">Your weekly digest of what matters in AI</p>
    </div>

    <!-- Divider -->
    <div style="height:1px;background:linear-gradient(90deg,transparent,#334155,transparent);margin-bottom:32px;"></div>

    <!-- Generated Content -->
    <div style="color:#cbd5e1;font-size:15px;line-height:1.7;">
      {body_html}
    </div>

    <!-- Divider -->
    <div style="height:1px;background:linear-gradient(90deg,transparent,#334155,transparent);margin:32px 0;"></div>

    <!-- Footer -->
    <div style="text-align:center;">
      <p style="color:#475569;font-size:12px;margin:0 0 8px;">
        You're receiving this because you subscribed to the Mailair AI Pulse newsletter.
      </p>
      <a href="{unsubscribe_url}" style="color:#6366f1;font-size:12px;text-decoration:underline;">
        Unsubscribe
      </a>
      <p style="color:#334155;font-size:11px;margin:12px 0 0;">
        © {datetime.now().year} Mailair. AI-powered email for service businesses.
      </p>
    </div>

  </div>
</body>
</html>"""


# ─── Sending ──────────────────────────────────────────────────────────────────

async def send_resend_email(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend API."""
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping newsletter send")
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                RESEND_API,
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": "AI Pulse <newsletter@mailair.company>",
                    "to": [to],
                    "subject": subject,
                    "html": html,
                },
            )
            if resp.status_code not in (200, 201):
                logger.error("Resend error %s: %s", resp.status_code, resp.text)
                return False
            return True
    except Exception as exc:
        logger.error("send_resend_email error: %s", exc)
        return False


# ─── Weekly Send Job ──────────────────────────────────────────────────────────

async def send_weekly_ai_newsletter() -> None:
    """APScheduler job: generate and send weekly AI newsletter to all subscribers."""
    logger.info("Starting weekly AI newsletter send")
    supabase = get_supabase()

    try:
        subs = (
            supabase.table("newsletter_subscriptions")
            .select("*")
            .eq("subscribed", True)
            .execute()
        )
        subscribers = subs.data or []
    except Exception as exc:
        logger.error("Failed to fetch newsletter subscribers: %s", exc)
        return

    if not subscribers:
        logger.info("No newsletter subscribers — skipping")
        return

    week_label = datetime.now(timezone.utc).strftime("Week of %B %d, %Y")
    subject = f"AI Pulse: {week_label}"

    try:
        body_html, _ = await generate_newsletter_html(week_label)
    except Exception as exc:
        logger.error("Newsletter content generation failed: %s", exc)
        return

    sent = 0
    for sub in subscribers:
        try:
            unsubscribe_url = f"{settings.FRONTEND_URL}/api/newsletter/unsubscribe?token={sub['unsubscribe_token']}"
            full_html = _wrap_newsletter_html(body_html, week_label, unsubscribe_url)
            ok = await send_resend_email(sub["email"], subject, full_html)
            if ok:
                sent += 1
        except Exception as exc:
            logger.error("Failed to send to %s: %s", sub.get("email"), exc)

    logger.info("Weekly AI newsletter sent to %d/%d subscribers", sent, len(subscribers))


# ─── Subscription Helpers ─────────────────────────────────────────────────────

def get_or_create_subscription(user_id: str, email: str, name: Optional[str] = None) -> dict:
    supabase = get_supabase()
    result = (
        supabase.table("newsletter_subscriptions")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    if result.data:
        return result.data[0]
    token = secrets.token_urlsafe(32)
    insert = supabase.table("newsletter_subscriptions").insert({
        "user_id": user_id,
        "email": email,
        "name": name or "",
        "subscribed": False,
        "unsubscribe_token": token,
    }).execute()
    return insert.data[0] if insert.data else {}


def set_subscription(user_id: str, subscribed: bool) -> bool:
    try:
        supabase = get_supabase()
        supabase.table("newsletter_subscriptions").update(
            {"subscribed": subscribed}
        ).eq("user_id", user_id).execute()
        return True
    except Exception as exc:
        logger.error("set_subscription error: %s", exc)
        return False


def unsubscribe_by_token(token: str) -> bool:
    try:
        supabase = get_supabase()
        supabase.table("newsletter_subscriptions").update(
            {"subscribed": False}
        ).eq("unsubscribe_token", token).execute()
        return True
    except Exception as exc:
        logger.error("unsubscribe_by_token error: %s", exc)
        return False
