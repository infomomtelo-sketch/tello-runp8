-- Tello Phase 1: Core tables (additive to nwlhs)
-- RUN IN SUPABASE SQL EDITOR: nwlhsshvqmbhemhxcran

-- 1. tello_businesses
CREATE TABLE IF NOT EXISTS tello_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('product', 'services', 'marketplace', 'saas', 'other')),
  description TEXT,
  monthly_revenue BIGINT DEFAULT 0,
  constraints TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tello_businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_their_businesses" ON tello_businesses
  FOR ALL USING (auth.uid() = user_id);

-- 2. tello_vault_snapshots
CREATE TABLE IF NOT EXISTS tello_vault_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES tello_businesses(id) ON DELETE CASCADE,
  vault_name TEXT,
  snapshot_json JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tello_vault_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_their_snapshots" ON tello_vault_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- 3. tello_github_integrations
CREATE TABLE IF NOT EXISTS tello_github_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES tello_businesses(id) ON DELETE CASCADE,
  repo_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tello_github_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_their_integrations" ON tello_github_integrations
  FOR ALL USING (auth.uid() = user_id);

-- 4. tello_decision_templates
CREATE TABLE IF NOT EXISTS tello_decision_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  framework JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tello_decision_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_are_public" ON tello_decision_templates FOR SELECT USING (true);

-- Seed templates
INSERT INTO tello_decision_templates (name, description, framework) VALUES
  ('deploy', 'Pre-deploy checklist', '{"steps": ["tests pass", "migrations ready", "rollback plan"]}'),
  ('pricing', 'Pricing decision framework', '{"steps": ["cost analysis", "competitor research", "customer feedback"]}'),
  ('pivot', 'Pivot decision criteria', '{"steps": ["market signals", "runway", "customer demand"]}'),
  ('feature_scope', 'Feature scope decision', '{"steps": ["impact", "effort", "strategic fit"]}')
ON CONFLICT (name) DO NOTHING;

-- 5. tello_decisions
CREATE TABLE IF NOT EXISTS tello_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES tello_businesses(id) ON DELETE CASCADE,
  template_id UUID REFERENCES tello_decision_templates(id),
  title TEXT NOT NULL,
  context TEXT,
  options JSONB,
  decision TEXT,
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tello_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_their_decisions" ON tello_decisions
  FOR ALL USING (auth.uid() = user_id);

-- 6. tello_alerts
CREATE TABLE IF NOT EXISTS tello_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES tello_businesses(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tello_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_their_alerts" ON tello_alerts
  FOR ALL USING (auth.uid() = user_id);

-- Verify migration
SELECT COUNT(*) as tello_tables FROM information_schema.tables 
WHERE table_name LIKE 'tello_%' AND table_schema = 'public';
