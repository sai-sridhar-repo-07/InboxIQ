from pydantic import BaseModel, UUID4
from typing import Optional, List
from datetime import datetime


class EmailBase(BaseModel):
    subject: str
    sender: str
    body: str
    received_at: datetime


class EmailCreate(EmailBase):
    user_id: str
    gmail_message_id: Optional[str] = None
    thread_id: Optional[str] = None


class EmailResponse(EmailBase):
    id: str
    user_id: str
    priority: Optional[int] = None
    category: Optional[str] = None
    ai_summary: Optional[str] = None
    confidence_score: Optional[float] = None
    processed: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class EmailFilter(BaseModel):
    category: Optional[str] = None
    min_priority: Optional[int] = None
    processed: Optional[bool] = None
    search: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: Optional[str] = None
    limit: int = 20
    offset: int = 0


class AIAnalysis(BaseModel):
    category: str
    priority_score: int
    summary: str
    action_items: List[dict]
    confidence_score: float
