import base64
import json
import logging
from datetime import datetime, timezone
from email import message_from_bytes
from typing import Any

import httpx
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from config import settings
from database import get_supabase

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]

CLIENT_CONFIG = {
    "web": {
        "client_id": settings.GMAIL_CLIENT_ID,
        "client_secret": settings.GMAIL_CLIENT_SECRET,
        "redirect_uris": [settings.GMAIL_REDIRECT_URI],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
}


def _build_flow() -> Flow:
    return Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        redirect_uri=settings.GMAIL_REDIRECT_URI,
    )


# ---------------------------------------------------------------------------
# OAuth helpers
# ---------------------------------------------------------------------------

def get_oauth_url(user_id: str) -> str:
    """Generate the Google OAuth consent URL for the given user."""
    flow = _build_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        state=user_id,
        prompt="consent",
    )
    return auth_url


async def exchange_code(code: str, user_id: str) -> dict:
    """
    Exchange an OAuth authorisation code for access/refresh tokens and persist
    them in Supabase.  Returns the token dict.
    """
    import os
    os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
    flow = _build_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials

    tokens = {
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": list(credentials.scopes or SCOPES),
        "expiry": credentials.expiry.isoformat() if credentials.expiry else None,
    }

    # Fetch the user's Gmail address from the userinfo endpoint
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v1/userinfo",
                headers={"Authorization": f"Bearer {credentials.token}"},
                timeout=10,
            )
            if resp.status_code == 200:
                tokens["gmail_address"] = resp.json().get("email")
    except Exception as exc:
        logger.warning("Could not fetch Gmail address: %s", exc)

    await store_gmail_tokens(user_id, tokens)
    return tokens


async def store_gmail_tokens(user_id: str, tokens: dict) -> None:
    """Upsert Gmail tokens for a user in Supabase."""
    try:
        supabase = get_supabase()

        expiry_iso = tokens.get("expiry")
        row = {
            "user_id": user_id,
            "access_token": tokens.get("access_token", ""),
            "refresh_token": tokens.get("refresh_token"),
            "token_expiry": expiry_iso,
            "gmail_address": tokens.get("gmail_address"),
        }
        supabase.table("gmail_tokens").upsert(row, on_conflict="user_id").execute()

        # Mark user as Gmail-connected
        supabase.table("user_profiles").update({"gmail_connected": True}).eq(
            "id", user_id
        ).execute()

    except Exception as exc:
        logger.error("store_gmail_tokens error (user_id=%s): %s", user_id, exc)
        raise


async def get_gmail_tokens(user_id: str) -> dict | None:
    """Retrieve stored Gmail tokens for a user."""
    try:
        supabase = get_supabase()
        result = (
            supabase.table("gmail_tokens")
            .select("access_token, refresh_token, token_expiry, gmail_address")
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        if result.data:
            row = result.data
            return {
                "access_token": row.get("access_token"),
                "refresh_token": row.get("refresh_token"),
                "expiry": row.get("token_expiry"),
                "gmail_address": row.get("gmail_address"),
                "token_uri": "https://oauth2.googleapis.com/token",
                "client_id": settings.GMAIL_CLIENT_ID,
                "client_secret": settings.GMAIL_CLIENT_SECRET,
                "scopes": SCOPES,
            }
        return None
    except Exception as exc:
        logger.error("get_gmail_tokens error (user_id=%s): %s", user_id, exc)
        return None


def _credentials_from_tokens(tokens: dict) -> Credentials:
    from google.oauth2.credentials import Credentials as GCreds

    expiry = None
    if tokens.get("expiry"):
        try:
            expiry = datetime.fromisoformat(tokens["expiry"])
            # google-auth compares expiry against datetime.utcnow() (naive),
            # so strip tzinfo after converting to UTC.
            if expiry.tzinfo is not None:
                expiry = expiry.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            pass

    return GCreds(
        token=tokens.get("access_token"),
        refresh_token=tokens.get("refresh_token"),
        token_uri=tokens.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=tokens.get("client_id", settings.GMAIL_CLIENT_ID),
        client_secret=tokens.get("client_secret", settings.GMAIL_CLIENT_SECRET),
        scopes=tokens.get("scopes", SCOPES),
        expiry=expiry,
    )


async def refresh_token(user_id: str) -> dict | None:
    """Refresh an expired access token and persist the updated credentials."""
    try:
        tokens = await get_gmail_tokens(user_id)
        if not tokens:
            return None

        creds = _credentials_from_tokens(tokens)
        import google.auth.transport.requests as grequests

        creds.refresh(grequests.Request())

        tokens["access_token"] = creds.token
        tokens["expiry"] = creds.expiry.isoformat() if creds.expiry else None
        await store_gmail_tokens(user_id, tokens)
        return tokens

    except Exception as exc:
        logger.error("refresh_token error (user_id=%s): %s", user_id, exc)
        return None


# ---------------------------------------------------------------------------
# Fetch & parse emails
# ---------------------------------------------------------------------------

def parse_gmail_message(message: dict) -> dict:
    """
    Convert a raw Gmail API message object into a flat dict suitable for
    storage.
    """
    headers = {
        h["name"].lower(): h["value"]
        for h in message.get("payload", {}).get("headers", [])
    }

    subject = headers.get("subject", "(No Subject)")
    sender = headers.get("from", "unknown@unknown.com")
    date_str = headers.get("date", "")

    try:
        from email.utils import parsedate_to_datetime
        received_at = parsedate_to_datetime(date_str)
    except Exception:
        received_at = datetime.now(timezone.utc)

    body = _extract_body(message.get("payload", {}))

    return {
        "gmail_message_id": message.get("id"),
        "thread_id": message.get("threadId"),
        "subject": subject,
        "sender": sender,
        "body": body,
        "received_at": received_at.isoformat(),
    }


def _html_to_text(html: str) -> str:
    """Convert HTML to clean plain text."""
    import re
    # Remove style and script blocks entirely (including their content)
    html = re.sub(r"<style[^>]*>.*?</style>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    # Replace block-level tags with newlines for readability
    html = re.sub(r"<br\s*/?>|</p>|</div>|</tr>|</li>", "\n", html, flags=re.IGNORECASE)
    # Remove remaining tags
    text = re.sub(r"<[^>]+>", " ", html)
    # Decode common HTML entities
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"')
    # Collapse excessive whitespace while preserving line breaks
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
    text = "\n".join(line for line in lines if line)
    return text.strip()


def _decode_part(part: dict) -> str:
    """Base64-decode a message part's body data."""
    data = part.get("body", {}).get("data", "")
    if not data:
        return ""
    return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")


def _extract_body(payload: dict) -> str:
    """
    Recursively extract clean plain-text body from a Gmail message payload.
    Prefers text/plain over text/html to avoid CSS/HTML noise.
    """
    mime_type = payload.get("mimeType", "")

    # Direct text/plain — best option
    if mime_type == "text/plain":
        return _decode_part(payload)

    # Direct text/html — convert properly
    if mime_type == "text/html":
        raw = _decode_part(payload)
        return _html_to_text(raw) if raw else ""

    # Multipart — collect plain and html separately, prefer plain
    parts = payload.get("parts", [])
    plain_text = ""
    html_text = ""

    for part in parts:
        part_mime = part.get("mimeType", "")
        if part_mime == "text/plain":
            plain_text = plain_text or _decode_part(part)
        elif part_mime == "text/html":
            raw = _decode_part(part)
            html_text = html_text or (_html_to_text(raw) if raw else "")
        else:
            # Recurse into nested multipart (multipart/alternative, multipart/related, etc.)
            nested = _extract_body(part)
            if nested:
                plain_text = plain_text or nested

    return plain_text or html_text or ""


async def fetch_new_emails(user_id: str) -> list[dict]:
    """
    Fetch unread emails from the user's Gmail inbox.

    Returns a list of parsed email dicts ready to be inserted via
    email_service.create_email.
    """
    try:
        tokens = await get_gmail_tokens(user_id)
        if not tokens:
            logger.warning("No Gmail tokens for user_id=%s", user_id)
            return []

        creds = _credentials_from_tokens(tokens)

        # Refresh if expired
        if creds.expired and creds.refresh_token:
            import google.auth.transport.requests as grequests
            creds.refresh(grequests.Request())
            tokens["access_token"] = creds.token
            tokens["expiry"] = creds.expiry.isoformat() if creds.expiry else None
            await store_gmail_tokens(user_id, tokens)

        service = build("gmail", "v1", credentials=creds, cache_discovery=False)

        # List unread message ids (max 50 per poll)
        list_result = (
            service.users()
            .messages()
            .list(userId="me", q="is:unread in:inbox", maxResults=50)
            .execute()
        )
        message_refs = list_result.get("messages", [])

        if not message_refs:
            return []

        parsed_emails = []
        for ref in message_refs:
            try:
                raw_msg = (
                    service.users()
                    .messages()
                    .get(userId="me", id=ref["id"], format="full")
                    .execute()
                )
                parsed = parse_gmail_message(raw_msg)
                parsed["user_id"] = user_id
                parsed_emails.append(parsed)
            except HttpError as exc:
                logger.error(
                    "Failed to fetch Gmail message id=%s: %s", ref["id"], exc
                )

        return parsed_emails

    except Exception as exc:
        logger.error("fetch_new_emails error (user_id=%s): %s", user_id, exc)
        return []


async def send_gmail_reply(
    user_id: str, thread_id: str, to: str, subject: str, body: str
) -> bool:
    """Send an email reply via the Gmail API."""
    try:
        tokens = await get_gmail_tokens(user_id)
        if not tokens:
            return False

        creds = _credentials_from_tokens(tokens)
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)

        raw_message = _build_raw_message(to=to, subject=f"Re: {subject}", body=body)
        service.users().messages().send(
            userId="me",
            body={"raw": raw_message, "threadId": thread_id},
        ).execute()
        return True

    except Exception as exc:
        logger.error("send_gmail_reply error (user_id=%s): %s", user_id, exc)
        return False


def _build_raw_message(to: str, subject: str, body: str) -> str:
    """Construct a base64url-encoded RFC 2822 message."""
    from email.mime.text import MIMEText

    msg = MIMEText(body)
    msg["to"] = to
    msg["subject"] = subject
    return base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")


async def get_email_attachments(user_id: str, gmail_message_id: str) -> list[dict]:
    """Return attachment metadata (name, mime_type, size, attachment_id) for an email."""
    try:
        tokens = await get_gmail_tokens(user_id)
        if not tokens:
            return []
        creds = _credentials_from_tokens(tokens)
        if creds.expired and creds.refresh_token:
            import google.auth.transport.requests as grequests
            creds.refresh(grequests.Request())
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        msg = service.users().messages().get(userId="me", id=gmail_message_id, format="full").execute()
        attachments = []
        _collect_attachments(msg.get("payload", {}), gmail_message_id, attachments)
        return attachments
    except Exception as exc:
        logger.error("get_email_attachments error: %s", exc)
        return []


def _collect_attachments(payload: dict, message_id: str, result: list) -> None:
    """Recursively collect attachment parts from a Gmail message payload."""
    filename = payload.get("filename", "")
    attachment_id = payload.get("body", {}).get("attachmentId")
    size = payload.get("body", {}).get("size", 0)
    mime_type = payload.get("mimeType", "")

    if filename and attachment_id:
        result.append({
            "attachment_id": attachment_id,
            "message_id": message_id,
            "filename": filename,
            "mime_type": mime_type,
            "size": size,
        })

    for part in payload.get("parts", []):
        _collect_attachments(part, message_id, result)


async def get_attachment_data(user_id: str, gmail_message_id: str, attachment_id: str) -> bytes | None:
    """Download and return raw attachment bytes from Gmail."""
    try:
        tokens = await get_gmail_tokens(user_id)
        if not tokens:
            return None
        creds = _credentials_from_tokens(tokens)
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        result = service.users().messages().attachments().get(
            userId="me", messageId=gmail_message_id, id=attachment_id
        ).execute()
        data = result.get("data", "")
        if not data:
            return None
        return base64.urlsafe_b64decode(data + "==")
    except Exception as exc:
        logger.error("get_attachment_data error: %s", exc)
        return None


async def disconnect_gmail(user_id: str) -> bool:
    """Remove Gmail tokens and mark the user as disconnected."""
    try:
        supabase = get_supabase()
        supabase.table("gmail_tokens").delete().eq("user_id", user_id).execute()
        supabase.table("user_profiles").update({"gmail_connected": False}).eq(
            "id", user_id
        ).execute()
        return True
    except Exception as exc:
        logger.error("disconnect_gmail error (user_id=%s): %s", user_id, exc)
        return False
