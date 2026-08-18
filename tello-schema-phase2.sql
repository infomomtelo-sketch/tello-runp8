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

-- Verify Phase 2 migration
SELECT COUNT(*) as total_tello_tables FROM information_schema.tables 
WHERE table_name LIKE 'tello_%' AND table_schema = 'public';
