from fastapi import APIRouter, Depends
from middleware.auth import get_current_user
from services.relationship_service import compute_relationship_scores, get_sentiment_history

router = APIRouter(prefix="/relationships", tags=["relationships"])


@router.get("")
async def get_relationships(current_user: dict = Depends(get_current_user)):
    scores = await compute_relationship_scores(current_user["id"])
    return {"contacts": scores, "total": len(scores)}


@router.get("/{contact_email}/sentiment")
async def get_sentiment(contact_email: str, days: int = 90, current_user: dict = Depends(get_current_user)):
    history = await get_sentiment_history(current_user["id"], contact_email, days)
    return {"contact_email": contact_email, "history": history}
