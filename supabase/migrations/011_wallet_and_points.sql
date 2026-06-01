-- Migration 011: Wallet, point system, and transactions for PayOS deposit and subscription renewal

-- 1. Table wallets manages homestay point balances
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table wallet_transactions logs point loading and plan spending
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amount_vnd NUMERIC NOT NULL DEFAULT 0,
  points INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'upgrade', 'renew', 'refund')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  description TEXT,
  payos_order_code BIGINT UNIQUE, -- orderCode must be a 64-bit integer for PayOS
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table plan_settings manages dynamic points-based pricing and limits
CREATE TABLE plan_settings (
  plan TEXT PRIMARY KEY CHECK (plan IN ('lite', 'pro', 'premium')),
  price_points INTEGER NOT NULL DEFAULT 0 CHECK (price_points >= 0),
  message_limit INTEGER NOT NULL DEFAULT 1000 CHECK (message_limit >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate plan settings with user requested values
INSERT INTO plan_settings (plan, price_points, message_limit) VALUES
  ('lite', 109, 1000),
  ('pro', 319, 2500),
  ('premium', 359, 4000)
ON CONFLICT (plan) DO UPDATE SET
  price_points = EXCLUDED.price_points,
  message_limit = EXCLUDED.message_limit;

-- 4. Indexes for fast analytics queries
CREATE INDEX idx_wallets_property ON wallets(property_id);
CREATE INDEX idx_wallet_transactions_property ON wallet_transactions(property_id);
CREATE INDEX idx_wallet_transactions_order_code ON wallet_transactions(payos_order_code);

-- 5. Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_settings ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Tenant can view own wallet"
  ON wallets FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM users_properties
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant can view own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM users_properties
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view plan settings"
  ON plan_settings FOR SELECT
  USING (true);

-- Admin policies
CREATE POLICY "Admin can manage all wallets"
  ON wallets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users_properties
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can manage all wallet transactions"
  ON wallet_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users_properties
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin can manage plan settings"
  ON plan_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users_properties
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 7. RPC to atomically increment wallet balance (handles safe upsert and concurrency)
CREATE OR REPLACE FUNCTION increment_wallet_balance(p_property_id UUID, p_points INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO wallets (property_id, points_balance)
  VALUES (p_property_id, p_points)
  ON CONFLICT (property_id)
  DO UPDATE SET points_balance = wallets.points_balance + p_points, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
