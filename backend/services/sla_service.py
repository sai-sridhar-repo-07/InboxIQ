"""
SLA / Response Time Tracker.
Track response time commitments per client tier, alert on breaches.
"""
import logging
from datetime import datetime, timezone, timedelta

from database import get_supabase

logger = logging.getLogger(__name__)


def get_sla_configs(user_id: str) -> list[dict]:
    supabase = get_supabase()
    result = supabase.table("sla_configs").select("*").eq("user_id", user_id).order("max_response_hours").execute()
    return result.data or []


def create_sla_config(user_id: str, tier_name: str, max_response_hours: int, sender_patterns: list[str]) -> dict:
    supabase = get_supabase()
    result = supabase.table("sla_configs").insert({
        "user_id": user_id,
        "tier_name": tier_name,
        "max_response_hours": max_response_hours,
        "sender_patterns": sender_patterns,
    }).execute()
    return result.data[0] if result.data else {}


def delete_sla_config(config_id: str, user_id: str) -> bool:
    try:
        get_supabase().table("sla_configs").delete().eq("id", config_id).eq("user_id", user_id).execute()
        return True
    except Exception as exc:
        logger.error("delete_sla_config error: %s", exc)
        return False


def _email_matches_config(sender: str, patterns: list[str]) -> bool:
    sender_lower = sender.lower()
    for p in patterns:
        if p.lower() in sender_lower:
            return True
    return False


def compute_sla_status(user_id: str) -> dict:
    """Check all open emails against SLA configs. Return breach/warning/ok lists."""
    supabase = get_supabase()
    configs = get_sla_configs(user_id)
    if not configs:
        return {"breached": [], "warning": [], "ok": [], "configs": []}

    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=7)).isoformat()

    result = (
        supabase.table("emails")
        .select("id, sender, subject, received_at, category, is_read, priority")
        .eq("user_id", user_id)
        .neq("dismissed", True)
        .in_("category", ["needs_response", "urgent", "urgent_client_request", "quote_request"])
        .gte("received_at", cutoff)
        .order("received_at", desc=True)
        .execute()
    )
    emails = result.data or []

    breached, warning, ok = [], [], []

    for email in emails:
        sender = email.get("sender", "") or ""
        received_str = email.get("received_at", "")
        try:
            received_dt = datetime.fromisoformat(received_str.replace("Z", "+00:00"))
        except Exception:
            continue

        age_hours = (now - received_dt).total_seconds() / 3600

        matched_config = None
        for config in configs:
            if _email_matches_config(sender, config.get("sender_patterns") or []):
                matched_config = config
                break

        if not matched_config:
            matched_config = configs[-1]  # default to most lenient

        max_hours = matched_config["max_response_hours"]
        entry = {
            **email,
            "sla_tier": matched_config["tier_name"],
            "max_response_hours": max_hours,
            "age_hours": round(age_hours, 1),
            "pct_used": min(100, int((age_hours / max_hours) * 100)),
        }

        if age_hours > max_hours:
            breached.append(entry)
        elif age_hours > max_hours * 0.8:
            warning.append(entry)
        else:
            ok.append(entry)

    return {
        "breached": breached[:20],
        "warning": warning[:20],
        "ok": ok[:20],
        "configs": configs,
        "total_monitored": len(emails),
    }
