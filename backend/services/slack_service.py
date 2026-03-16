import logging
import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Slack Block Kit message formatter
# ---------------------------------------------------------------------------

def format_slack_message(email_data: dict) -> dict:
    """
    Build a Slack Block Kit payload for an urgent email alert.

    Parameters
    ----------
    email_data: dict with keys subject, sender, ai_summary, priority,
                category, id (email id).
    """
    priority = email_data.get("priority", "N/A")
    subject = email_data.get("subject", "(No Subject)")
    sender = email_data.get("sender", "Unknown")
    summary = email_data.get("ai_summary", "No summary available.")
    category = (email_data.get("category") or "unknown").replace("_", " ").title()
    email_id = email_data.get("id", "")

    return {
        "text": f":rotating_light: *Urgent Email Alert* — Priority {priority}/10",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"\U0001f6a8 Urgent Email — Priority {priority}/10",
                    "emoji": True,
                },
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Subject:*\n{subject}"},
                    {"type": "mrkdwn", "text": f"*From:*\n{sender}"},
                    {"type": "mrkdwn", "text": f"*Category:*\n{category}"},
                    {"type": "mrkdwn", "text": f"*Priority Score:*\n{priority}/10"},
                ],
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"*Summary:*\n{summary}"},
            },
            {"type": "divider"},
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Email ID: `{email_id}` | InboxIQ Alert System",
                    }
                ],
            },
        ],
    }


# ---------------------------------------------------------------------------
# Webhook helpers
# ---------------------------------------------------------------------------

async def send_urgent_alert(webhook_url: str, email_data: dict) -> bool:
    """
    POST a Slack alert for an urgent email to *webhook_url*.

    Returns True on success, False otherwise.
    """
    if not webhook_url:
        logger.warning("send_urgent_alert called with empty webhook_url; skipping.")
        return False

    payload = format_slack_message(email_data)

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            response = await http.post(webhook_url, json=payload)
            response.raise_for_status()
            logger.info(
                "Slack alert sent for email_id=%s (status=%s)",
                email_data.get("id"),
                response.status_code,
            )
            return True
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Slack webhook HTTP error (status=%s): %s",
            exc.response.status_code,
            exc,
        )
        return False
    except Exception as exc:
        logger.error("Slack webhook error: %s", exc)
        return False


async def send_slack_notification(webhook_url: str, message: str) -> bool:
    """POST a plain markdown message to webhook_url."""
    if not webhook_url:
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            response = await http.post(webhook_url, json={"text": message})
            response.raise_for_status()
            logger.info("Slack notification sent (status=%s)", response.status_code)
            return True
    except Exception as exc:
        logger.error("Slack notification error: %s", exc)
        return False


async def test_webhook(webhook_url: str) -> bool:
    """
    Send a simple test message to validate that *webhook_url* is reachable.

    Returns True if Slack responds with HTTP 200.
    """
    if not webhook_url:
        return False

    test_payload = {
        "text": ":white_check_mark: InboxIQ Slack integration connected successfully!"
    }

    try:
        async with httpx.AsyncClient(timeout=10) as http:
            response = await http.post(webhook_url, json=test_payload)
            return response.status_code == 200
    except Exception as exc:
        logger.error("test_webhook error: %s", exc)
        return False
