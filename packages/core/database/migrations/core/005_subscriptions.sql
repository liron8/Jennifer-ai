-- Core Schema: Subscriptions
-- This migration creates the subscriptions and billing tables

CREATE TABLE IF NOT EXISTS core.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  tier VARCHAR(50) NOT NULL CHECK (tier IN ('trial', 'starter', 'pro', 'enterprise')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete', 'incomplete_expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  quantity INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON core.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON core.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON core.subscriptions(status);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON core.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION core.update_updated_at_column();

ALTER TABLE core.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization subscription"
  ON core.subscriptions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM core.users WHERE id = auth.uid()
    )
  );

-- Invoices table
CREATE TABLE IF NOT EXISTS core.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES core.subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id VARCHAR(255) UNIQUE,
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(50) CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON core.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON core.invoices(stripe_invoice_id);

ALTER TABLE core.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view organization invoices"
  ON core.invoices
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM core.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Usage tracking table
CREATE TABLE IF NOT EXISTS core.usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES core.organizations(id) ON DELETE CASCADE,
  metric VARCHAR(100) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_usage_records_organization_id ON core.usage_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_metric ON core.usage_records(metric);
CREATE INDEX IF NOT EXISTS idx_usage_records_recorded_at ON core.usage_records(recorded_at);

ALTER TABLE core.usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view usage records"
  ON core.usage_records
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM core.users WHERE id = auth.uid() AND role = 'admin'
    )
  );
