from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from middleware.auth import get_current_user
from services.quote_service import generate_quote_from_email, list_quotes, update_quote_status

router = APIRouter(prefix="/quotes", tags=["quotes"])


@router.get("")
async def get_quotes(current_user: dict = Depends(get_current_user)):
    return {"quotes": list_quotes(current_user["id"])}


@router.post("/generate/{email_id}", status_code=201)
async def generate_quote(email_id: str, current_user: dict = Depends(get_current_user)):
    quote = await generate_quote_from_email(email_id, current_user["id"])
    if not quote:
        raise HTTPException(status_code=404, detail="Email not found or quote generation failed")
    return quote


class StatusUpdate(BaseModel):
    status: str  # draft|sent|accepted|rejected


@router.patch("/{quote_id}/status")
async def patch_status(quote_id: str, body: StatusUpdate, current_user: dict = Depends(get_current_user)):
    ok = update_quote_status(quote_id, current_user["id"], body.status)
    if not ok:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"status": body.status}
