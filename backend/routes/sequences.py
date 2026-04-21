from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from middleware.auth import get_current_user
from services.sequence_service import (
    list_sequences, create_sequence, delete_sequence,
    enroll_in_sequence, list_enrollments, cancel_enrollment,
)

router = APIRouter(prefix="/sequences", tags=["sequences"])


@router.get("")
async def get_sequences(current_user: dict = Depends(get_current_user)):
    return {"sequences": list_sequences(current_user["id"])}


class SequenceStep(BaseModel):
    delay_days: int
    subject_template: str
    body_template: str


class CreateSequenceBody(BaseModel):
    name: str
    steps: List[SequenceStep]


@router.post("", status_code=201)
async def post_sequence(body: CreateSequenceBody, current_user: dict = Depends(get_current_user)):
    seq = create_sequence(
        user_id=current_user["id"],
        name=body.name,
        steps=[s.model_dump() for s in body.steps],
    )
    return seq


@router.delete("/{seq_id}", status_code=204)
async def del_sequence(seq_id: str, current_user: dict = Depends(get_current_user)):
    ok = delete_sequence(seq_id, current_user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Sequence not found")


class EnrollBody(BaseModel):
    contact_email: str
    email_id: Optional[str] = None


@router.post("/{seq_id}/enroll", status_code=201)
async def enroll(seq_id: str, body: EnrollBody, current_user: dict = Depends(get_current_user)):
    enrollment = enroll_in_sequence(
        user_id=current_user["id"],
        sequence_id=seq_id,
        contact_email=body.contact_email,
        email_id=body.email_id,
    )
    if not enrollment:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return enrollment


@router.get("/enrollments")
async def get_enrollments(current_user: dict = Depends(get_current_user)):
    return {"enrollments": list_enrollments(current_user["id"])}


@router.post("/enrollments/{enrollment_id}/cancel", status_code=204)
async def cancel(enrollment_id: str, current_user: dict = Depends(get_current_user)):
    cancel_enrollment(enrollment_id, current_user["id"])
