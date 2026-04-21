from fastapi import APIRouter, Depends, Query
from typing import Optional
from middleware.auth import get_current_user
from services.knowledge_service import search_knowledge, list_knowledge, delete_knowledge_entry, extract_knowledge_from_email, bulk_extract_knowledge

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("")
async def get_knowledge(
    q: Optional[str] = Query(None),
    entry_type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    if q:
        entries = search_knowledge(current_user["id"], q, entry_type)
    else:
        entries = list_knowledge(current_user["id"], entry_type)
    return {"entries": entries, "total": len(entries)}


@router.post("/extract/{email_id}")
async def extract_from_email(email_id: str, current_user: dict = Depends(get_current_user)):
    entries = await extract_knowledge_from_email(email_id, current_user["id"])
    return {"entries": entries, "count": len(entries)}


@router.post("/bulk-extract")
async def bulk_extract(current_user: dict = Depends(get_current_user)):
    count = await bulk_extract_knowledge(current_user["id"])
    return {"extracted": count}


@router.delete("/{entry_id}", status_code=204)
async def delete_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    delete_knowledge_entry(entry_id, current_user["id"])
