import logging
import anthropic
from config import settings
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)
client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

REPLY_PROMPT = """You are an AI assistant helping a service business professional respond to emails.

Generate a professional, friendly, and helpful email reply.

Business Context: {company_description}
Preferred Tone: {tone}

Original Email from {sender}:
Subject: {subject}
Body: {body}{attachments_section}

Previous similar replies for context:
{similar_replies}

Write ONLY the reply text (no subject line, no metadata). Be concise, professional, and address all points raised."""

GUIDED_REPLY_PROMPT = """You are an AI assistant helping a service business professional respond to emails.

Generate an email reply based on the user's specific instructions.

Business Context: {company_description}
Preferred Tone: {tone}

Original Email from {sender}:
Subject: {subject}
Body: {body}{attachments_section}

User's instructions for this reply:
{instructions}

Write ONLY the reply text (no subject line, no metadata). Follow the user's instructions precisely while keeping the reply professional and appropriately toned."""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def generate_reply(
    subject: str,
    sender: str,
    body: str,
    company_description: str = "a professional service business",
    tone: str = "professional and friendly",
    similar_replies: list | None = None,
    user_instructions: str | None = None,
    attachments: list[str] | None = None,
) -> tuple[str, float]:
    """
    Generate an AI reply draft using Claude.

    If user_instructions is provided, uses a guided prompt that follows
    those instructions instead of generating a generic reply.

    Returns
    -------
    (draft_text, confidence_score)
    """
    try:
        attachments_section = ""
        if attachments:
            names = ", ".join(attachments)
            attachments_section = f"\nAttachments included in this email: {names}"

        if user_instructions:
            prompt = GUIDED_REPLY_PROMPT.format(
                company_description=company_description,
                tone=tone,
                sender=sender,
                subject=subject,
                body=body[:2000],
                attachments_section=attachments_section,
                instructions=user_instructions,
            )
        else:
            similar_context = (
                "\n".join([f"- {r}" for r in similar_replies[:3]])
                if similar_replies
                else "No previous replies available."
            )
            prompt = REPLY_PROMPT.format(
                company_description=company_description,
                tone=tone,
                sender=sender,
                subject=subject,
                body=body[:2000],
                attachments_section=attachments_section,
                similar_replies=similar_context,
            )

        response = await client.messages.create(
            model="claude-opus-4-6",
            max_tokens=700,
            messages=[{"role": "user", "content": prompt}],
        )

        draft = next(
            (block.text for block in response.content if block.type == "text"),
            "Thank you for your email. We will get back to you shortly.",
        ).strip()

        confidence = 0.92 if user_instructions else 0.88

        return draft, confidence

    except Exception as exc:
        logger.error("Reply generation error: %s", exc)
        return "Thank you for your email. We will get back to you shortly.", 0.3
