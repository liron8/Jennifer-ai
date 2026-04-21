-- Core Schema: Organizations
-- This migration creates the organizations table for multi-tenancy

CREATE SCHEMA IF NOT EXISTS core;

CREATE TABLE IF NOT EXISTS core.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  industry VARCHAR(100),
  size VARCHAR(50),
  website TEXT,
  subscription_tier VARCHAR(50) NOT NULL DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'starter', 'pro', 'enterprise')),
  subscription_status VARCHAR(50) NOT NULL DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  trial_ends_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON core.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON core.organizations(stripe_customer_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION core.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON core.organizations
  FOR EACH ROW
  EXECUTE FUNCTION core.update_updated_at_column();

-- Row Level Security
ALTER TABLE core.organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own organization
CREATE POLICY "Users can view their organization"
  ON core.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM core.users WHERE id = auth.uid()
    )
  );

-- Policy: Only admins can update their organization
CREATE POLICY "Admins can update their organization"
  ON core.organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM core.users WHERE id = auth.uid() AND role = 'admin'
    )
  );
