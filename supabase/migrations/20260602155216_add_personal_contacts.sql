-- Migration: Add support for personal offline contacts

-- 1. Update connections table
ALTER TABLE connections ALTER COLUMN user_b_id DROP NOT NULL;
ALTER TABLE connections ADD COLUMN contact_name TEXT;
ALTER TABLE connections ADD COLUMN contact_phone TEXT;

-- Prevent a user from having duplicate offline contacts for the same mobile number
CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_personal_contact_phone 
  ON connections (user_a_id, contact_phone) 
  WHERE user_b_id IS NULL;

-- 2. Update transactions table
ALTER TABLE transactions ALTER COLUMN counterparty_id DROP NOT NULL;

-- (Optional) If we want to ensure contact_phone and contact_name are provided for personal contacts:
ALTER TABLE connections ADD CONSTRAINT chk_personal_contact_details
  CHECK (
    (user_b_id IS NOT NULL) OR 
    (contact_name IS NOT NULL AND contact_phone IS NOT NULL)
  );

-- We need to drop the implicit UNIQUE(user_a_id, user_b_id) if it prevents multiple NULLs, 
-- but Postgres treats NULL != NULL in unique constraints, so multiple NULL user_b_id for the same user_a_id 
-- are allowed by default in Postgres UNIQUE constraints. So we don't need to drop it.
