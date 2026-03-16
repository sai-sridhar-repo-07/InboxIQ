-- ============================================================
-- InboxIQ v2 Migrations — Run in Supabase SQL Editor
-- ============================================================

-- Outlook / Microsoft OAuth tokens
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ms_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ms_email TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ms_access_token TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ms_refresh_token TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ms_token_expires_at TIMESTAMPTZ;

-- Google Calendar OAuth tokens
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gcal_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gcal_access_token TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gcal_refresh_token TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gcal_token_expires_at TIMESTAMPTZ;

-- Organizations (team workspaces)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan TEXT DEFAULT 'free',
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Org members
CREATE TABLE IF NOT EXISTS org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    invited_email TEXT,
    invite_token TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'removed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- Email assignments (who is working on this email)
CREATE TABLE IF NOT EXISTS email_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email_id)
);

-- Internal notes on emails (team-visible)
CREATE TABLE IF NOT EXISTS internal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log (org-level audit trail)
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outbound webhooks
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] DEFAULT '{}',
    secret TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add org fields to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS org_role TEXT DEFAULT 'owner';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_email_id ON internal_notes(email_id);
CREATE INDEX IF NOT EXISTS idx_email_assignments_email_id ON email_assignments(email_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_org_id ON activity_log(org_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
