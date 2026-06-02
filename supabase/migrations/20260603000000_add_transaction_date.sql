-- Migration: Add transaction_date for backdated transaction support
-- Run this in your Supabase SQL Editor

-- 1. Add transaction_date column (date only, no time)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS transaction_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 2. Backfill existing rows with their created_at date
UPDATE transactions
  SET transaction_date = created_at::date
  WHERE transaction_date = CURRENT_DATE
    AND created_at::date != CURRENT_DATE;

-- 3. Create index for sorting by transaction_date
CREATE INDEX IF NOT EXISTS idx_txn_transaction_date
  ON transactions (transaction_date DESC, created_at DESC);
