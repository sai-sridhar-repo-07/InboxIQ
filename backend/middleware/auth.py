import logging
import time
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from config import settings
from database import get_supabase

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=True)

# ─── JWKS cache ───────────────────────────────────────────────────────────────
_jwks_cache: dict | None = None
_jwks_fetched_at: float = 0
_JWKS_TTL = 3600  # re-fetch at most once per hour


def _get_jwks() -> dict:
    global _jwks_cache, _jwks_fetched_at
    now = time.time()
    if _jwks_cache and (now - _jwks_fetched_at) < _JWKS_TTL:
        return _jwks_cache

    jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    try:
        resp = httpx.get(jwks_url, timeout=10)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_fetched_at = now
        logger.info("JWKS refreshed from %s", jwks_url)
        return _jwks_cache
    except Exception as exc:
        logger.error("Failed to fetch JWKS: %s", exc)
        if _jwks_cache:
            logger.warning("Using stale JWKS cache")
            return _jwks_cache
        raise


def _decode_supabase_jwt(token: str) -> dict:
    """
    Decode and verify a Supabase JWT using JWKS (supports both legacy HS256
    and the newer ECC P-256 / ES256 keys).
    """
    jwks = _get_jwks()

    # Try each key in the JWKS until one works
    errors = []
    for key_data in jwks.get("keys", []):
        alg = key_data.get("alg", "RS256")
        try:
            payload = jwt.decode(
                token,
                key_data,
                algorithms=[alg],
                audience="authenticated",
                options={"verify_aud": True},
            )
            return payload
        except JWTError as exc:
            errors.append(f"{key_data.get('kid', '?')}: {exc}")
            continue

    # Fall back to legacy HS256 shared secret if JWKS keys all fail
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError as exc:
        errors.append(f"legacy-hs256: {exc}")

    logger.warning("All JWT verification attempts failed: %s", errors)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def verify_token(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer_scheme)],
) -> dict:
    return _decode_supabase_jwt(credentials.credentials)


async def get_current_user(
    payload: Annotated[dict, Depends(verify_token)],
) -> dict:
    user_id: str | None = payload.get("sub")
    email: str | None = payload.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identifier.",
        )

    try:
        supabase = get_supabase()
        result = (
            supabase.table("user_profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
        profile = result.data or {}
    except Exception as exc:
        logger.warning(
            "Could not load profile for user_id=%s: %s — returning minimal user",
            user_id,
            exc,
        )
        profile = {}

    profile.setdefault("id", user_id)
    profile.setdefault("email", email or "")

    return profile
