from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ActionBase(BaseModel):
    task: str
    deadline: Optional[datetime] = None
    status: str = "pending"
    priority: Optional[str] = "medium"
    notes: Optional[str] = None


class ActionCreate(ActionBase):
    email_id: Optional[str] = None
    priority: Optional[str] = "medium"
    notes: Optional[str] = None


class ActionResponse(ActionBase):
    id: str
    email_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ActionUpdate(BaseModel):
    task: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
