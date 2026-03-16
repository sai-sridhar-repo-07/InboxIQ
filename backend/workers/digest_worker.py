"""
Daily email digest — runs every morning at 8am UTC.
Sends a summary of the past 24h important emails to each user's Slack.
"""
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


async def send_daily_digest() -> None:
    """Send daily digest to all users with Slack webhooks configured."""
    from database import get_supabase
    from services.slack_service import send_slack_notification

    try:
        supabase = get_supabase()

        profiles = supabase.table("user_profiles").select(
            "id, slack_webhook_url, full_name"
        ).not_.is_("slack_webhook_url", "null").execute()

        users = profiles.data or []
        if not users:
            logger.info("No users with Slack configured — skipping digest.")
            return

        now = datetime.now(timezone.utc)
        since = (now - timedelta(hours=24)).isoformat()

        for user in users:
            user_id = user["id"]
            webhook_url = user.get("slack_webhook_url", "").strip()
            if not webhook_url:
                continue

            try:
                result = supabase.table("emails").select(
                    "id, subject, sender, category, priority"
                ).eq("user_id", user_id).gte("received_at", since).neq(
                    "dismissed", True
                ).order("priority", desc=True).execute()

                emails = result.data or []
                if not emails:
                    continue

                total = len(emails)
                urgent = [e for e in emails if e.get("category") == "urgent_client_request"]
                needs_resp = [e for e in emails if e.get("category") in ("needs_response", "follow_up_required")]
                unprocessed = [e for e in emails if not e.get("category")]

                lines = [
                    f"*📬 InboxIQ Daily Digest — {now.strftime('%B %d, %Y')}*",
                    f"You received *{total}* email{'s' if total != 1 else ''} in the last 24 hours.\n",
                ]

                if urgent:
                    lines.append(f"*🔴 Urgent ({len(urgent)}):*")
                    for e in urgent[:3]:
                        lines.append(f"  • {e.get('subject', '(No Subject)')} — from {e.get('sender', 'Unknown')}")
                    if len(urgent) > 3:
                        lines.append(f"  _...and {len(urgent) - 3} more_")

                if needs_resp:
                    lines.append(f"\n*💬 Needs Response ({len(needs_resp)}):*")
                    for e in needs_resp[:3]:
                        lines.append(f"  • {e.get('subject', '(No Subject)')} — from {e.get('sender', 'Unknown')}")

                if unprocessed:
                    lines.append(f"\n*⚙️ {len(unprocessed)} email{'s' if len(unprocessed) != 1 else ''} not yet processed by AI*")

                lines.append("\n_Manage your inbox at InboxIQ_")

                await send_slack_notification(webhook_url, "\n".join(lines))
                logger.info("Daily digest sent to user %s (%d emails)", user_id, total)

            except Exception as exc:
                logger.error("Digest failed for user %s: %s", user_id, exc)

    except Exception as exc:
        logger.error("send_daily_digest error: %s", exc)
