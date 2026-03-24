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
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#1e40af 0%,#1e3a8a 100%);padding:40px 40px 36px;">
                <!-- Logo image -->
                <img src="https://mailair.company/logo-dark.svg" alt="Mailair" width="140" style="display:block;margin-bottom:28px;height:auto;" />
                <h1 style="margin:0 0 8px;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">You're on the list! 🎉</h1>
                <p style="margin:0;color:#93c5fd;font-size:15px;font-weight:500;">Mailair Early Access Waitlist</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:40px 40px 32px;">
                <p style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:600;">Hi {first},</p>
                <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.75;">
                  Thanks for joining the Mailair waitlist. You're among the first to know when we launch — we'll reach out the moment early access opens.
                </p>

                <!-- Feature box -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:28px;">
                  <tr><td style="padding:24px 28px;">
                    <p style="margin:0 0 16px;color:#0f172a;font-size:14px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;">What Mailair does for you</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding:5px 0;">
                        <span style="display:inline-block;background:#dbeafe;color:#1d4ed8;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700;margin-right:10px;">AI</span>
                        <span style="color:#334155;font-size:14px;">Categorizes every email automatically</span>
                      </td></tr>
                      <tr><td style="padding:5px 0;">
                        <span style="display:inline-block;background:#fee2e2;color:#b91c1c;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700;margin-right:10px;">URGENT</span>
                        <span style="color:#334155;font-size:14px;">Surfaces critical client emails instantly</span>
                      </td></tr>
                      <tr><td style="padding:5px 0;">
                        <span style="display:inline-block;background:#dcfce7;color:#15803d;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700;margin-right:10px;">DRAFT</span>
                        <span style="color:#334155;font-size:14px;">Writes reply drafts so you respond in seconds</span>
                      </td></tr>
                      <tr><td style="padding:5px 0;">
                        <span style="display:inline-block;background:#fef9c3;color:#854d0e;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:700;margin-right:10px;">TASKS</span>
                        <span style="color:#334155;font-size:14px;">Extracts action items so nothing falls through</span>
                      </td></tr>
                    </table>
                  </td></tr>
                </table>

                <p style="margin:0 0 32px;color:#475569;font-size:15px;line-height:1.75;">
                  No spam, no newsletters — just one email when early access opens.
                </p>

                <!-- CTA button -->
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:12px;background:#2563eb;">
                      <a href="https://mailair.company" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">
                        Visit mailair.company &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Divider -->
            <tr><td style="padding:0 40px;"><div style="height:1px;background:#f1f5f9;"></div></td></tr>

            <!-- Footer -->
            <tr>
              <td style="padding:24px 40px;text-align:center;">
                <img src="https://mailair.company/logo.svg" alt="Mailair" width="80" style="display:block;margin:0 auto 12px;opacity:0.4;" />
                <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                  © 2025 Mailair. All rights reserved.<br/>
                  You received this because you joined the Mailair waitlist.
                </p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """

    async with httpx.AsyncClient() as client:
        # Send confirmation to user
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
        # Notify admin
        await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": "Mailair Waitlist <hello@mailair.company>",
                "to": ["saisridhart@gmail.com"],
                "subject": f"🎉 New waitlist signup: {email}",
                "html": f"""
                <div style="font-family:sans-serif;max-width:480px;margin:40px auto;background:#f8fafc;border-radius:16px;padding:32px;border:1px solid #e2e8f0;">
                  <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">New waitlist signup</h2>
                  <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Someone just joined the Mailair waitlist.</p>
                  <table style="width:100%;border-collapse:collapse;">
                    <tr>
                      <td style="padding:10px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:8px 8px 0 0;font-size:13px;color:#64748b;font-weight:600;">NAME</td>
                      <td style="padding:10px 14px;background:#fff;border:1px solid #e2e8f0;border-top:none;font-size:14px;color:#0f172a;">{name or "—"}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 14px;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;font-size:13px;color:#64748b;font-weight:600;">EMAIL</td>
                      <td style="padding:10px 14px;background:#fff;border:1px solid #e2e8f0;border-top:none;font-size:14px;color:#2563eb;">{email}</td>
                    </tr>
                  </table>
                  <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;">Mailair · mailair.company</p>
                </div>
                """,
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
