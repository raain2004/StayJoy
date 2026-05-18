-- Migration: Enable RLS and create policies for all tables
-- Requirements 11.1, 11.2, 11.3

-- Enable RLS on all tables
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Tenant isolation policies (filter by property_id via users_properties)
-- ============================================================

CREATE POLICY "tenant_own_bookings"
ON bookings FOR ALL
USING (
  property_id IN (
    SELECT property_id FROM users_properties
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "tenant_own_service_requests"
ON service_requests FOR ALL
USING (
  property_id IN (
    SELECT property_id FROM users_properties
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "tenant_own_rooms"
ON rooms FOR ALL
USING (
  property_id IN (
    SELECT property_id FROM users_properties
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "tenant_read_own_subscription"
ON subscriptions FOR SELECT
USING (
  property_id IN (
    SELECT property_id FROM users_properties
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- Admin full access policies (role = 'admin' in users_properties)
-- ============================================================

CREATE POLICY "admin_full_access_bookings"
ON bookings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users_properties
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin_full_access_service_requests"
ON service_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users_properties
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin_full_access_rooms"
ON rooms FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users_properties
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin_full_access_subscriptions"
ON subscriptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users_properties
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "admin_full_access_properties"
ON properties FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users_properties
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
