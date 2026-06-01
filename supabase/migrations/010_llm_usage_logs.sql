-- Migration 010: Track LLM Token Usage per request
-- Purpose: Record input/output token counts for every LLM call,
--          enabling cost analysis and usage analytics per property.

CREATE TABLE llm_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,           -- 'gemini', 'openai', 'groq', 'anthropic', etc.
  model TEXT NOT NULL,              -- 'gemini-2.5-flash-lite', 'gpt-4o-mini', etc.
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  year_month TEXT NOT NULL,         -- 'YYYY-MM' for fast monthly aggregation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_llm_usage_property_month ON llm_usage_logs(property_id, year_month);
CREATE INDEX idx_llm_usage_month ON llm_usage_logs(year_month);
CREATE INDEX idx_llm_usage_created ON llm_usage_logs(created_at);

-- RLS
ALTER TABLE llm_usage_logs ENABLE ROW LEVEL SECURITY;

-- Tenant can view own usage logs
CREATE POLICY "Tenant can view own llm usage"
  ON llm_usage_logs FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM users_properties
      WHERE user_id = auth.uid()
    )
  );

-- Admin can view all usage logs
CREATE POLICY "Admin can view all llm usage"
  ON llm_usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users_properties
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
