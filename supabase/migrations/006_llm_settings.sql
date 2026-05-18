-- LLM Settings table for admin-configurable AI provider settings
CREATE TABLE llm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT NOT NULL DEFAULT 'gemini-2.0-flash-lite',
  api_key TEXT NOT NULL,
  fallback_provider TEXT,
  fallback_model TEXT,
  fallback_api_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Only one active config at a time
CREATE UNIQUE INDEX idx_llm_settings_active ON llm_settings(is_active) WHERE is_active = true;

-- RLS: only admin can access
ALTER TABLE llm_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage LLM settings"
  ON llm_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users_properties
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_llm_settings_updated_at
  BEFORE UPDATE ON llm_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
