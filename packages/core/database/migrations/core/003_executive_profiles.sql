-- Core Schema: Executive Profiles
-- This migration creates the executive_profiles table

CREATE TABLE IF NOT EXISTS core.executive_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,
  bio TEXT,
  timezone VARCHAR(100) DEFAULT 'UTC',
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  
  -- Preferences
  preferences JSONB DEFAULT '{
    "meeting_buffer": 15,
    "preferred_meeting_times": [],
    "travel_preferences": "",
    "dietary_restrictions": "",
    "communication_preferences": {}
  }',
  
  -- Metadata
  created_by UUID REFERENCES core.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_executive_profiles_organization_id ON core.executive_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_executive_profiles_email ON core.executive_profiles(email);

-- Updated at trigger
CREATE TRIGGER update_executive_profiles_updated_at
  BEFORE UPDATE ON core.executive_profiles
  FOR EACH ROW
  EXECUTE FUNCTION core.update_updated_at_column();

-- Row Level Security
ALTER TABLE core.executive_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view executives in their organization
CREATE POLICY "Users can view organization executives"
  ON core.executive_profiles
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM core.users WHERE id = auth.uid()
    )
  );

-- Policy: Users can create executives in their organization
CREATE POLICY "Users can create organization executives"
  ON core.executive_profiles
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM core.users WHERE id = auth.uid()
    )
  );

-- Policy: Users can update executives in their organization
CREATE POLICY "Users can update organization executives"
  ON core.executive_profiles
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM core.users WHERE id = auth.uid()
    )
  );

-- Policy: Admins can delete executives in their organization
CREATE POLICY "Admins can delete organization executives"
  ON core.executive_profiles
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM core.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Junction table for user-executive assignments
CREATE TABLE IF NOT EXISTS core.user_executive_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  executive_id UUID NOT NULL REFERENCES core.executive_profiles(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, executive_id)
);

CREATE INDEX IF NOT EXISTS idx_user_executive_assignments_user_id ON core.user_executive_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_executive_assignments_executive_id ON core.user_executive_assignments(executive_id);

ALTER TABLE core.user_executive_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their assignments"
  ON core.user_executive_assignments
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their assignments"
  ON core.user_executive_assignments
  FOR ALL
  USING (user_id = auth.uid());
