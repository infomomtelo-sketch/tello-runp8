-- Tello — complete schema (Phases 1, 2 and 3 combined)
-- Paste the whole file into the Supabase SQL editor and Run.
-- Safe to run more than once.

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
DROP POLICY IF EXISTS "users_own_their_businesses" ON tello_businesses;
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
DROP POLICY IF EXISTS "users_own_their_snapshots" ON tello_vault_snapshots;
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
DROP POLICY IF EXISTS "users_own_their_integrations" ON tello_github_integrations;
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
DROP POLICY IF EXISTS "templates_are_public" ON tello_decision_templates;
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
DROP POLICY IF EXISTS "users_own_their_decisions" ON tello_decisions;
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
DROP POLICY IF EXISTS "users_own_their_alerts" ON tello_alerts;
CREATE POLICY "users_own_their_alerts" ON tello_alerts
  FOR ALL USING (auth.uid() = user_id);



-- Tello Phase 2: Images, sharing, and history (additive to Phase 1)
-- RUN IN SUPABASE SQL EDITOR AFTER Phase 1

-- Add new columns to tello_decisions
ALTER TABLE tello_decisions 
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS outcome TEXT,
ADD COLUMN IF NOT EXISTS image_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tello_decisions_share_token ON tello_decisions(share_token);

-- tello_decision_images
CREATE TABLE IF NOT EXISTS tello_decision_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES tello_decisions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_data BYTEA,
  vision_analysis JSONB,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tello_decision_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_images_via_decision" ON tello_decision_images;
CREATE POLICY "users_own_images_via_decision" ON tello_decision_images
  FOR ALL USING (
    decision_id IN (
      SELECT id FROM tello_decisions WHERE user_id = auth.uid()
    )
  );

-- tello_decision_history (event log)
CREATE TABLE IF NOT EXISTS tello_decision_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES tello_decisions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tello_decision_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_history_via_decision" ON tello_decision_history;
CREATE POLICY "users_own_history_via_decision" ON tello_decision_history
  FOR ALL USING (
    decision_id IN (
      SELECT id FROM tello_decisions WHERE user_id = auth.uid()
    )
  );

-- tello_decision_outcomes
CREATE TABLE IF NOT EXISTS tello_decision_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES tello_decisions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  notes TEXT,
  follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tello_decision_outcomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_outcomes_via_decision" ON tello_decision_outcomes;
CREATE POLICY "users_own_outcomes_via_decision" ON tello_decision_outcomes
  FOR ALL USING (
    decision_id IN (
      SELECT id FROM tello_decisions WHERE user_id = auth.uid()
    )
  );

-- Helper functions
CREATE OR REPLACE FUNCTION update_decision_image_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tello_decisions 
  SET image_count = (SELECT COUNT(*) FROM tello_decision_images WHERE decision_id = NEW.decision_id)
  WHERE id = NEW.decision_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_image_count ON tello_decision_images;
CREATE TRIGGER trigger_update_image_count 
AFTER INSERT OR DELETE ON tello_decision_images
FOR EACH ROW
EXECUTE FUNCTION update_decision_image_count();

CREATE OR REPLACE FUNCTION log_decision_event(
  p_decision_id UUID,
  p_event_type TEXT,
  p_event_data JSONB
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO tello_decision_history (decision_id, event_type, event_data)
  VALUES (p_decision_id, p_event_type, p_event_data)
  RETURNING id INTO v_event_id;
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;



-- Tello Phase 3: Public share links (additive to Phase 1 + 2)
-- RUN IN SUPABASE SQL EDITOR AFTER Phase 2
--
-- Why a function instead of an RLS policy:
-- The anon key ships in the browser bundle, so a permissive SELECT policy like
-- USING (share_token IS NOT NULL) would let anyone request tello_decisions with
-- no filter and dump every shared decision. The client-side .eq('share_token', ...)
-- is not a security boundary. This SECURITY DEFINER function takes the token as an
-- argument, so a caller can only ever retrieve a decision whose token they already
-- hold, and only the columns listed below.

CREATE OR REPLACE FUNCTION public.get_shared_decision(p_share_token TEXT)
RETURNS TABLE (
  title      TEXT,
  context    TEXT,
  options    JSONB,
  decision   TEXT,
  reasoning  TEXT,
  outcome    TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.title, d.context, d.options, d.decision, d.reasoning, d.outcome, d.created_at
  FROM public.tello_decisions d
  WHERE d.share_token = p_share_token
    AND p_share_token IS NOT NULL
    AND length(p_share_token) >= 16;
$$;

-- Only anon + authenticated may call it; nothing else inherits execute.
REVOKE ALL ON FUNCTION public.get_shared_decision(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_decision(TEXT) TO anon, authenticated;

-- Revoking a share link: clear the token and the link stops resolving immediately.
--   UPDATE tello_decisions SET share_token = NULL WHERE id = '<decision-id>';

-- Verification: expects 9 tables and the share-link function.
SELECT
  (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name LIKE 'tello_%') AS tello_tables,
  (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'get_shared_decision') AS share_function;
