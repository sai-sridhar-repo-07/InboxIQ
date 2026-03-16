import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str

    # Anthropic / Claude
    ANTHROPIC_API_KEY: str

    # Gmail OAuth
    GMAIL_CLIENT_ID: str = ""
    GMAIL_CLIENT_SECRET: str = ""
    GMAIL_REDIRECT_URI: str = "http://localhost:8000/integrations/gmail/callback"

    # Slack
    SLACK_WEBHOOK_URL: str = ""

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_PRO_MONTHLY: str = "price_pro_monthly"
    STRIPE_PRICE_PRO_YEARLY: str = "price_pro_annual"
    STRIPE_PRICE_AGENCY_MONTHLY: str = "price_agency_monthly"
    STRIPE_PRICE_AGENCY_YEARLY: str = "price_agency_annual"

    # JWT / Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # AI Thresholds
    URGENCY_THRESHOLD: int = 7

    # Environment
    ENVIRONMENT: str = "development"

    # CORS — accepts a JSON array string or comma-separated string in .env
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return ["http://localhost:3000", "http://localhost:5173"]
            # Try JSON array first: ["url1","url2"]
            if v.startswith("["):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            # Fall back to comma-separated: url1,url2
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
