-- Migration: Create knowledge_base_sections table
-- Requirements: 1.1, 1.2, 1.7

CREATE TABLE knowledge_base_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (property_id, section_key)
);

-- Trigger: auto-update updated_at on row change
-- Requirements: 1.4
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_knowledge_base_sections_updated_at
  BEFORE UPDATE ON knowledge_base_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Row Level Security
-- Requirements: 1.5
ALTER TABLE knowledge_base_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage own sections"
  ON knowledge_base_sections
  FOR ALL
  USING (
    property_id IN (
      SELECT property_id FROM users_properties
      WHERE user_id = auth.uid()
    )
  );
