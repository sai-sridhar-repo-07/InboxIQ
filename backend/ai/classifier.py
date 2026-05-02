import json
import logging
import anthropic
from config import settings
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)
client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

CLASSIFICATION_PROMPT = """You are an AI assistant for a service business email management system.

Analyze the following email and return a JSON object with exactly these fields:
- category: one of ["urgent_client_request", "quote_request", "support_issue", "internal_communication", "follow_up_required", "informational", "spam"]
- priority_score: integer from 1-10 (10 = most urgent)
- summary: concise 1-2 sentence summary
- action_items: array of objects with fields "task" (string) and "deadline" (string or null)
- confidence_score: float from 0.0 to 1.0
- language: ISO 639-1 language code of the email (e.g. 'en', 'es', 'fr', 'de', 'pt', 'hi', 'zh', 'ja')
- is_phishing: boolean — true if the email shows signs of phishing or social engineering
- phishing_indicators: array of strings listing specific suspicious elements found (empty array if none)
- is_invoice: boolean — true if the email is an invoice, bill, receipt, or payment request
- invoice_amount: string or null — total amount due (e.g. "$1,200.00"), null if not an invoice
- invoice_due_date: string or null — payment due date as ISO date string, null if not found
- invoice_vendor: string or null — name of the company sending the invoice, null if not an invoice

Email Subject: {subject}
From: {sender}
Email Body:
{body}{attachments_section}

Return ONLY valid JSON, no other text."""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def classify_email(subject: str, sender: str, body: str, attachments: list[str] | None = None) -> dict:
    """Classify an email using Claude and return structured analysis."""
    try:
        attachments_section = ""
        if attachments:
            names = ", ".join(attachments)
            attachments_section = f"\n\nAttachments included in this email: {names}"

        prompt = CLASSIFICATION_PROMPT.format(
            subject=subject,
            sender=sender,
            body=body[:3000],
            attachments_section=attachments_section,
        )

        response = await client.messages.create(
            model="claude-opus-4-6",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )

        # Extract the text block from the response
        text_content = next(
            (block.text for block in response.content if block.type == "text"),
            None,
        )

        if not text_content:
            raise ValueError("No text content in Claude response")

        # Claude may wrap JSON in markdown fences — strip them
        raw = text_content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        result = json.loads(raw)

        # Validate and normalise all expected fields
        result["category"] = result.get("category", "informational")
        result["priority_score"] = max(1, min(10, int(result.get("priority_score", 5))))
        result["confidence_score"] = max(
            0.0, min(1.0, float(result.get("confidence_score", 0.8)))
        )
        result["action_items"] = result.get("action_items", [])
        result["summary"] = result.get("summary", "")
        result["language"] = result.get("language", "en")
        result["is_phishing"] = bool(result.get("is_phishing", False))
        result["phishing_indicators"] = result.get("phishing_indicators", [])
        result["is_invoice"] = bool(result.get("is_invoice", False))
        result["invoice_amount"] = result.get("invoice_amount") or None
        result["invoice_due_date"] = result.get("invoice_due_date") or None
        result["invoice_vendor"] = result.get("invoice_vendor") or None

        return result

    except Exception as exc:
        logger.error("Classification error: %s", exc)
        return {
            "category": "informational",
            "priority_score": 5,
            "summary": "Unable to process email automatically.",
            "action_items": [],
            "confidence_score": 0.0,
        }
