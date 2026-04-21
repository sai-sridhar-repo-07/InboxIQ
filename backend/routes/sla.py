from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from middleware.auth import get_current_user
from services.sla_service import get_sla_configs, create_sla_config, delete_sla_config, compute_sla_status

router = APIRouter(prefix="/sla", tags=["sla"])


@router.get("/status")
async def sla_status(current_user: dict = Depends(get_current_user)):
    return compute_sla_status(current_user["id"])


@router.get("/configs")
async def list_configs(current_user: dict = Depends(get_current_user)):
    return {"configs": get_sla_configs(current_user["id"])}


class SLAConfigBody(BaseModel):
    tier_name: str
    max_response_hours: int
    sender_patterns: List[str] = []


@router.post("/configs", status_code=201)
async def create_config(body: SLAConfigBody, current_user: dict = Depends(get_current_user)):
    config = create_sla_config(
        user_id=current_user["id"],
        tier_name=body.tier_name,
        max_response_hours=body.max_response_hours,
        sender_patterns=body.sender_patterns,
    )
    return config


@router.delete("/configs/{config_id}", status_code=204)
async def del_config(config_id: str, current_user: dict = Depends(get_current_user)):
    ok = delete_sla_config(config_id, current_user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Config not found")
