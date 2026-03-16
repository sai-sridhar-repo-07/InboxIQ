-- ============================================================
-- InboxIQ v3 Migrations — Run in Supabase SQL Editor
-- ============================================================

-- Fix webhooks table to match backend API
-- (v2 had events[] + enabled; v3 uses event TEXT + is_active)
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS event TEXT DEFAULT 'all';
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Auto-assign rules (org-level rules to auto-assign emails to members)
CREATE TABLE IF NOT EXISTS auto_assign_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    condition_type TEXT NOT NULL CHECK (condition_type IN ('sender_domain', 'category', 'priority_gte')),
    condition_value TEXT NOT NULL,
    assign_to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_assign_rules_org_id ON auto_assign_rules(org_id);
