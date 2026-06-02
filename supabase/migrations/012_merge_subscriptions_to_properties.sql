-- Add columns plan and expires_at to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'trial';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Migrate existing subscription data
-- For each property, grab the latest subscription based on created_at
UPDATE properties p
SET
  plan = COALESCE(s.plan, 'trial'),
  expires_at = CASE
    WHEN s.status = 'trial' THEN s.trial_ends_at
    ELSE s.expires_at
  END
FROM (
  SELECT DISTINCT ON (property_id) property_id, plan, status, trial_ends_at, expires_at
  FROM subscriptions
  ORDER BY property_id, created_at DESC
) s
WHERE p.id = s.property_id;
