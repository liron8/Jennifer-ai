-- Core Schema: Users
-- This migration creates the users table

CREATE TABLE IF NOT EXISTS core.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(50),
  timezone VARCHAR(100) DEFAULT 'UTC',
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  job_title VARCHAR(255),
  organization_id UUID REFERENCES core.organizations(id) ON DELETE SET NULL,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON core.users(email);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON core.users(organization_id);

-- Updated at trigger
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON core.users
  FOR EACH ROW
  EXECUTE FUNCTION core.update_updated_at_column();

-- Row Level Security
ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view themselves
CREATE POLICY "Users can view themselves"
  ON core.users
  FOR SELECT
  USING (id = auth.uid());

-- Policy: Users can view other users in their organization
CREATE POLICY "Users can view organization members"
  ON core.users
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM core.users WHERE id = auth.uid()
    )
  );

-- Policy: Users can update themselves
CREATE POLICY "Users can update themselves"
  ON core.users
  FOR UPDATE
  USING (id = auth.uid());

-- Policy: Admins can update users in their organization
CREATE POLICY "Admins can update organization members"
  ON core.users
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM core.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION core.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO core.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION core.handle_new_user();
