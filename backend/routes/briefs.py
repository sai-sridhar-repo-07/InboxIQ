from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from middleware.auth import get_current_user
from services.brief_service import generate_meeting_brief, list_briefs

router = APIRouter(prefix="/briefs", tags=["briefs"])


@router.get("")
async def get_briefs(current_user: dict = Depends(get_current_user)):
    return {"briefs": list_briefs(current_user["id"])}


class BriefRequest(BaseModel):
    title: str
    start_time: str
    attendee_emails: List[str]
    description: Optional[str] = None


@router.post("", status_code=201)
async def create_brief(body: BriefRequest, current_user: dict = Depends(get_current_user)):
    brief = await generate_meeting_brief(
        user_id=current_user["id"],
        event=body.model_dump(),
    )
    return brief
