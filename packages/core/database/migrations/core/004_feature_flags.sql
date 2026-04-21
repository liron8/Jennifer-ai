-- Core Schema: Feature Flags
-- This migration creates the feature_flags table

CREATE TABLE IF NOT EXISTS core.feature_flags (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  tier_required VARCHAR(50) NOT NULL DEFAULT 'core' CHECK (tier_required IN ('core', 'pro', 'enterprise')),
  rollout_percentage INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  org_whitelist UUID[] DEFAULT '{}',
  org_blacklist UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated at trigger
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON core.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION core.update_updated_at_column();

-- Seed default feature flags
INSERT INTO core.feature_flags (id, name, description, tier_required) VALUES
  ('dashboard', 'Dashboard', 'Main dashboard module', 'core'),
  ('scheduling', 'Scheduling', 'Calendar and meeting management', 'core'),
  ('tasks', 'Task Hub', 'Task management and approvals', 'core'),
  ('key-dates', 'Key Dates', 'Important dates tracking', 'core'),
  ('reports', 'Reporting', 'Analytics and insights', 'core'),
  ('team', 'Team Management', 'Executive profiles and team', 'core'),
  ('events', 'Events Hub', 'Event planning and management', 'pro'),
  ('contacts', 'Contacts', 'Contact management', 'pro'),
  ('concierge', 'Concierge Services', 'Service provider directory', 'pro'),
  ('settings', 'Settings', 'User and organization settings', 'core')
ON CONFLICT (id) DO NOTHING;

-- Organization-specific feature flag overrides
CREATE TABLE IF NOT EXISTS core.organization_feature_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  feature_flag_id VARCHAR(100) NOT NULL REFERENCES core.feature_flags(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, feature_flag_id)
);

CREATE INDEX IF NOT EXISTS idx_org_feature_overrides_org_id ON core.organization_feature_overrides(organization_id);

ALTER TABLE core.organization_feature_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view feature overrides"
  ON core.organization_feature_overrides
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM core.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage feature overrides"
  ON core.organization_feature_overrides
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM core.users WHERE id = auth.uid() AND role = 'admin'
    )
  );
