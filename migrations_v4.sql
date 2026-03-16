-- ============================================================
-- InboxIQ v4 Migrations — Run in Supabase SQL Editor
-- ============================================================

-- HubSpot integration
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS hubspot_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS hubspot_api_key TEXT;

-- Salesforce integration
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sf_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sf_consumer_key TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sf_consumer_secret TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sf_username TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sf_password TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sf_security_token TEXT;
