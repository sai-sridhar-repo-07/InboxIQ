from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ActionBase(BaseModel):
    task: str
    deadline: Optional[datetime] = None
    status: str = "pending"


class ActionCreate(ActionBase):
    email_id: str


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
