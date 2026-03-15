import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from database import get_supabase
from middleware.auth import get_current_user, verify_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignUpRequest):
    """Register a new user via Supabase Auth."""
    supabase = get_supabase()
    try:
        result = supabase.auth.sign_up(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:
        logger.error("Signup error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if not result.user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signup failed. The email may already be registered.",
        )

    user_id = result.user.id

    # Create a profile row for the new user
    try:
        supabase.table("user_profiles").insert(
            {
                "id": user_id,
                "email": body.email,
                "name": body.name or "",
                "plan": "free",
            }
        ).execute()
    except Exception as exc:
        logger.warning("Could not create user_profile for %s: %s", user_id, exc)

    session = result.session
    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user={"id": user_id, "email": body.email},
    )


@router.post("/signin", response_model=AuthResponse)
async def signin(body: SignInRequest):
    """Authenticate an existing user and return session tokens."""
    supabase = get_supabase()
    try:
        result = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:
        logger.warning("Signin failed for %s: %s", body.email, exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not result.user or not result.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
        )

    session = result.session
    user = result.user
    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user={"id": user.id, "email": user.email},
    )


@router.post("/signout", status_code=status.HTTP_204_NO_CONTENT)
async def signout(current_user: Annotated[dict, Depends(get_current_user)]):
    """Sign out the current user (invalidates the Supabase session server-side)."""
    try:
        supabase = get_supabase()
        supabase.auth.sign_out()
    except Exception as exc:
        logger.warning("Signout error (non-fatal): %s", exc)
    return None


@router.post("/refresh", response_model=AuthResponse)
async def refresh(body: RefreshRequest):
    """Refresh an expired access token using the refresh token."""
    supabase = get_supabase()
    try:
        result = supabase.auth.refresh_session(body.refresh_token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token refresh failed: {exc}",
        )

    if not result.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh session.",
        )

    session = result.session
    user = result.user
    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        user={"id": user.id, "email": user.email},
    )


@router.get("/me")
async def me(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return the profile of the currently authenticated user."""
    return current_user
