from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse

from middleware.auth import get_current_user
from services.newsletter_service import (
    get_or_create_subscription,
    set_subscription,
    unsubscribe_by_token,
    send_weekly_ai_newsletter,
)

router = APIRouter(prefix="/newsletter", tags=["newsletter"])


@router.get("/status")
async def get_newsletter_status(current_user: dict = Depends(get_current_user)):
    sub = get_or_create_subscription(
        user_id=current_user["id"],
        email=current_user.get("email", ""),
        name=current_user.get("name"),
    )
    return {"subscribed": sub.get("subscribed", False)}


@router.post("/subscribe")
async def subscribe_newsletter(current_user: dict = Depends(get_current_user)):
    get_or_create_subscription(
        user_id=current_user["id"],
        email=current_user.get("email", ""),
        name=current_user.get("name"),
    )
    ok = set_subscription(current_user["id"], subscribed=True)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to subscribe")
    return {"subscribed": True}


@router.post("/unsubscribe")
async def unsubscribe_newsletter(current_user: dict = Depends(get_current_user)):
    ok = set_subscription(current_user["id"], subscribed=False)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to unsubscribe")
    return {"subscribed": False}


@router.get("/unsubscribe")
async def public_unsubscribe(token: str):
    """One-click unsubscribe link from email footer."""
    ok = unsubscribe_by_token(token)
    if not ok:
        return HTMLResponse("<h2>Unsubscribe failed. Please try again.</h2>", status_code=400)
    return HTMLResponse("""
    <html>
    <head><title>Unsubscribed — Mailair</title></head>
    <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;color:white;">
      <div style="text-align:center;">
        <h2 style="font-size:24px;margin-bottom:8px;">You've been unsubscribed.</h2>
        <p style="color:#94a3b8;">You won't receive AI Pulse newsletters anymore.</p>
        <a href="https://mailair.company" style="color:#6366f1;">← Back to Mailair</a>
      </div>
    </body>
    </html>
    """)


@router.post("/send-now")
async def trigger_newsletter_send(current_user: dict = Depends(get_current_user)):
    """Admin-only: trigger newsletter send immediately for testing."""
    if current_user.get("email") not in ("tarrasridhar1154@gmail.com", "saisridhart@gmail.com"):
        raise HTTPException(status_code=403, detail="Admin only")
    await send_weekly_ai_newsletter()
    return {"status": "sent"}
