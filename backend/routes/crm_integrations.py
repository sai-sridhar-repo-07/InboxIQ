"""
CRM integration settings — HubSpot and Salesforce connection management.
"""
import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_supabase
from middleware.auth import get_current_user
from services.crypto_service import decrypt, encrypt

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/integrations/crm", tags=["crm-integrations"])


# ─── Pydantic models ──────────────────────────────────────────────────────────

class HubSpotSaveBody(BaseModel):
    api_key: str


class SalesforceSaveBody(BaseModel):
    consumer_key: str
    consumer_secret: str
    username: str
    password: str
    security_token: str


# ─── HubSpot endpoints ────────────────────────────────────────────────────────

@router.get("/hubspot/status")
async def hubspot_status(current_user: Annotated[dict, Depends(get_current_user)]):
    uid = current_user["id"]
    supabase = get_supabase()
    row = supabase.table("user_profiles").select("hubspot_connected, hubspot_api_key").eq("id", uid).single().execute()
    data = row.data or {}
    return {
        "connected": bool(data.get("hubspot_connected")),
        "has_key": bool(data.get("hubspot_api_key")),
    }


@router.post("/hubspot/connect")
async def hubspot_connect(body: HubSpotSaveBody, current_user: Annotated[dict, Depends(get_current_user)]):
    """Save HubSpot Private App token and verify it works."""
    from services.hubspot_service import test_connection

    uid = current_user["id"]
    ok = await test_connection(body.api_key)
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid HubSpot API key — connection test failed.")

    supabase = get_supabase()
    supabase.table("user_profiles").update({
        "hubspot_api_key": encrypt(body.api_key),
        "hubspot_connected": True,
    }).eq("id", uid).execute()
    return {"connected": True}


@router.post("/hubspot/test")
async def hubspot_test(current_user: Annotated[dict, Depends(get_current_user)]):
    """Send a test ping to HubSpot."""
    from services.hubspot_service import test_connection

    uid = current_user["id"]
    supabase = get_supabase()
    row = supabase.table("user_profiles").select("hubspot_api_key").eq("id", uid).single().execute()
    raw_key = (row.data or {}).get("hubspot_api_key", "")
    if not raw_key:
        raise HTTPException(status_code=400, detail="HubSpot not connected.")
    api_key = decrypt(raw_key)

    ok = await test_connection(api_key)
    return {"success": ok}


@router.delete("/hubspot/disconnect")
async def hubspot_disconnect(current_user: Annotated[dict, Depends(get_current_user)]):
    uid = current_user["id"]
    supabase = get_supabase()
    supabase.table("user_profiles").update({
        "hubspot_api_key": None,
        "hubspot_connected": False,
    }).eq("id", uid).execute()
    return {"connected": False}


# ─── Salesforce endpoints ─────────────────────────────────────────────────────

@router.get("/salesforce/status")
async def salesforce_status(current_user: Annotated[dict, Depends(get_current_user)]):
    uid = current_user["id"]
    supabase = get_supabase()
    row = supabase.table("user_profiles").select("sf_connected, sf_username").eq("id", uid).single().execute()
    data = row.data or {}
    return {
        "connected": bool(data.get("sf_connected")),
        "username": data.get("sf_username"),
    }


@router.post("/salesforce/connect")
async def salesforce_connect(body: SalesforceSaveBody, current_user: Annotated[dict, Depends(get_current_user)]):
    """Save Salesforce credentials and verify they work."""
    from services.salesforce_service import test_connection

    uid = current_user["id"]
    ok = await test_connection(
        body.consumer_key, body.consumer_secret,
        body.username, body.password, body.security_token,
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Salesforce authentication failed. Check your credentials.")

    supabase = get_supabase()
    supabase.table("user_profiles").update({
        "sf_consumer_key": encrypt(body.consumer_key),
        "sf_consumer_secret": encrypt(body.consumer_secret),
        "sf_username": body.username,  # not sensitive — used for display
        "sf_password": encrypt(body.password),
        "sf_security_token": encrypt(body.security_token),
        "sf_connected": True,
    }).eq("id", uid).execute()
    return {"connected": True}


@router.post("/salesforce/test")
async def salesforce_test(current_user: Annotated[dict, Depends(get_current_user)]):
    """Test the saved Salesforce credentials."""
    from services.salesforce_service import test_connection

    uid = current_user["id"]
    supabase = get_supabase()
    row = supabase.table("user_profiles").select(
        "sf_consumer_key, sf_consumer_secret, sf_username, sf_password, sf_security_token"
    ).eq("id", uid).single().execute()
    d = row.data or {}
    if not d.get("sf_username"):
        raise HTTPException(status_code=400, detail="Salesforce not connected.")

    ok = await test_connection(
        decrypt(d.get("sf_consumer_key", "")), decrypt(d.get("sf_consumer_secret", "")),
        d.get("sf_username", ""), decrypt(d.get("sf_password", "")), decrypt(d.get("sf_security_token", "")),
    )
    return {"success": ok}


@router.delete("/salesforce/disconnect")
async def salesforce_disconnect(current_user: Annotated[dict, Depends(get_current_user)]):
    uid = current_user["id"]
    supabase = get_supabase()
    supabase.table("user_profiles").update({
        "sf_consumer_key": None, "sf_consumer_secret": None,
        "sf_username": None, "sf_password": None, "sf_security_token": None,
        "sf_connected": False,
    }).eq("id", uid).execute()
    return {"connected": False}
