-- Migration 009: Track Monthly Usages for Quota Enforcement
-- Requirements: Track message usage per property per month to enforce SaaS limits.

CREATE TABLE monthly_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- Format: 'YYYY-MM', e.g., '2026-05'
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (property_id, year_month)
);

CREATE INDEX idx_monthly_usages_property ON monthly_usages(property_id, year_month);

-- RLS (Row Level Security)
ALTER TABLE monthly_usages ENABLE ROW LEVEL SECURITY;

-- Tenant can view own usage
CREATE POLICY "Tenant can view own monthly usages"
  ON monthly_usages FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM users_properties
      WHERE user_id = auth.uid()
    )
  );

-- Service role bypasses RLS for inserting/updating

-- Trigger for updated_at
CREATE TRIGGER update_monthly_usages_updated_at
  BEFORE UPDATE ON monthly_usages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment usage safely
CREATE OR REPLACE FUNCTION increment_monthly_usage(p_property_id UUID, p_year_month TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO monthly_usages (property_id, year_month, message_count)
  VALUES (p_property_id, p_year_month, 1)
  ON CONFLICT (property_id, year_month)
  DO UPDATE SET message_count = monthly_usages.message_count + 1;
END;
$$;
