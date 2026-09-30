-- ============================================================
-- SHARED LEDGER — Production Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_admin      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_active ON users(is_active);

-- ============================================================
-- SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================
-- CONNECTION REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS connection_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_user_id, to_user_id),
  CHECK (from_user_id != to_user_id)
);

CREATE INDEX idx_conn_req_from ON connection_requests(from_user_id);
CREATE INDEX idx_conn_req_to ON connection_requests(to_user_id);
CREATE INDEX idx_conn_req_status ON connection_requests(status);

-- ============================================================
-- CONNECTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS connections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_a_id, user_b_id),
  CHECK (user_a_id != user_b_id)
);

CREATE INDEX idx_connections_user_a ON connections(user_a_id);
CREATE INDEX idx_connections_user_b ON connections(user_b_id);

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id     UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  creator_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counterparty_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount            NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  direction         TEXT NOT NULL CHECK (direction IN ('give', 'get')),
  -- 'get'  = creator will RECEIVE money FROM counterparty (counterparty owes creator)
  -- 'give' = creator will GIVE money TO counterparty (creator owes counterparty)
  note              TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_txn_connection ON transactions(connection_id);
CREATE INDEX idx_txn_creator ON transactions(creator_id);
CREATE INDEX idx_txn_counterparty ON transactions(counterparty_id);
CREATE INDEX idx_txn_status ON transactions(status);
CREATE INDEX idx_txn_created_at ON transactions(created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER conn_req_updated_at
  BEFORE UPDATE ON connection_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (disabled — using service role in app)
-- ============================================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- REALTIME PUBLICATION
-- ============================================================
-- Enable realtime for transactions and connection_requests
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE connection_requests;

-- ============================================================
-- VIEWS
-- ============================================================

-- Net balance per connection per user
CREATE OR REPLACE VIEW connection_balances AS
SELECT
  c.id AS connection_id,
  u.id AS user_id,
  u.name AS user_name,
  COALESCE(
    SUM(
      CASE
        -- User is creator and direction is 'get' → counterparty owes user → positive
        WHEN t.creator_id = u.id AND t.direction = 'get' AND t.status = 'accepted' THEN t.amount
        -- User is creator and direction is 'give' → user owes counterparty → negative
        WHEN t.creator_id = u.id AND t.direction = 'give' AND t.status = 'accepted' THEN -t.amount
        -- User is counterparty and direction is 'get' → user owes creator → negative
        WHEN t.counterparty_id = u.id AND t.direction = 'get' AND t.status = 'accepted' THEN -t.amount
        -- User is counterparty and direction is 'give' → creator owes user → positive
        WHEN t.counterparty_id = u.id AND t.direction = 'give' AND t.status = 'accepted' THEN t.amount
        ELSE 0
      END
    ), 0
  ) AS net_amount
FROM connections c
CROSS JOIN users u
LEFT JOIN transactions t ON t.connection_id = c.id
WHERE u.id = c.user_a_id OR u.id = c.user_b_id
GROUP BY c.id, u.id, u.name;
