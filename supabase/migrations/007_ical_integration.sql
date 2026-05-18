-- Migration: iCal Integration tables
-- Allows homestay owners to sync availability with OTAs via iCal (.ics) format

CREATE TABLE ical_feeds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     TEXT NOT NULL,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  ical_url    TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_synced TIMESTAMPTZ,
  sync_error  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ical_feeds_room ON ical_feeds(room_id, property_id);

ALTER TABLE ical_feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant can manage own ical feeds"
  ON ical_feeds FOR ALL
  USING (property_id IN (SELECT property_id FROM users_properties WHERE user_id = auth.uid()));

CREATE TABLE ical_bookings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id     UUID NOT NULL REFERENCES ical_feeds(id) ON DELETE CASCADE,
  room_id     TEXT NOT NULL,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  uid         TEXT NOT NULL,
  summary     TEXT,
  check_in    DATE NOT NULL,
  check_out   DATE NOT NULL,
  source_name TEXT,
  synced_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feed_id, uid)
);

CREATE INDEX idx_ical_bookings_room_dates ON ical_bookings(room_id, property_id, check_in, check_out);

ALTER TABLE ical_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant can view own ical bookings"
  ON ical_bookings FOR ALL
  USING (property_id IN (SELECT property_id FROM users_properties WHERE user_id = auth.uid()));
