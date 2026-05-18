-- Migration: Create users_properties table
-- Requirements 12.2, 12.4

CREATE TABLE users_properties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'owner',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

CREATE INDEX idx_users_properties_user_id ON users_properties(user_id);
CREATE INDEX idx_users_properties_property_id ON users_properties(property_id);
