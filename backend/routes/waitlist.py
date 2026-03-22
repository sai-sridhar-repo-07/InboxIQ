import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from database import get_supabase
from config import settings

router = APIRouter()


class WaitlistRequest(BaseModel):
    email: EmailStr
    name: str = ""


async def _send_confirmation(email: str, name: str) -> None:
    if not settings.RESEND_API_KEY:
        return

    first = name.split()[0] if name else "there"

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:linear-gradient(135deg,#1e40af,#1e3a8a);padding:40px 40px 32px;">
          <div style="background:#2563eb;width:48px;height:48px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="color:white;font-size:22px;font-weight:900">M</span>
          </div>
          <h1 style="margin:0;color:white;font-size:26px;font-weight:800;letter-spacing:-0.5px;">You're on the list!</h1>
          <p style="margin:8px 0 0;color:#93c5fd;font-size:15px;">Mailair Early Access</p>
        </div>
        <div style="padding:36px 40px;">
          <p style="margin:0 0 16px;color:#1e293b;font-size:16px;">Hi {first},</p>
          <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;">
            Thanks for joining the Mailair waitlist. You're one of the first to know when we launch.
          </p>
          <div style="background:#f1f5f9;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
            <p style="margin:0 0 12px;color:#0f172a;font-size:14px;font-weight:700;">What Mailair does for you:</p>
            <p style="margin:4px 0;color:#475569;font-size:14px;">✦ &nbsp;AI categorizes every email automatically</p>
            <p style="margin:4px 0;color:#475569;font-size:14px;">✦ &nbsp;Surfaces urgent client emails instantly</p>
            <p style="margin:4px 0;color:#475569;font-size:14px;">✦ &nbsp;Drafts replies so you can respond in seconds</p>
            <p style="margin:4px 0;color:#475569;font-size:14px;">✦ &nbsp;Extracts action items so nothing is missed</p>
          </div>
          <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7;">
            We'll email you the moment early access opens. No spam, no newsletters — just the launch email.
          </p>
          <a href="https://mailair.company" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;">
            Visit mailair.company →
          </a>
        </div>
        <div style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">© 2025 Mailair. You received this because you joined the waitlist.</p>
        </div>
      </div>
    </body>
    </html>
    """

    async with httpx.AsyncClient() as client:
        await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": "Mailair <hello@mailair.company>",
                "to": [email],
                "subject": "You're on the Mailair waitlist 🎉",
                "html": html,
            },
            timeout=10,
        )


@router.post("/api/waitlist")
async def join_waitlist(body: WaitlistRequest):
    supabase = get_supabase()

    # Check duplicate
    existing = (
        supabase.table("waitlist")
        .select("id")
        .eq("email", body.email)
        .execute()
    )
    if existing.data:
        return {"message": "Already on the waitlist!"}

    supabase.table("waitlist").insert({
        "email": body.email,
        "name": body.name,
    }).execute()

    try:
        await _send_confirmation(body.email, body.name)
    except Exception:
        pass  # Don't fail the request if email fails

    return {"message": "You're on the list!"}
