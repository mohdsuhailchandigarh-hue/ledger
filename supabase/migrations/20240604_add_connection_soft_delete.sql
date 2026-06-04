-- ============================================================
-- Migration: Add per-side soft-delete flags to connections
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE connections
  ADD COLUMN IF NOT EXISTS deleted_by_a BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by_b BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering active connections efficiently
CREATE INDEX IF NOT EXISTS idx_connections_deleted ON connections(deleted_by_a, deleted_by_b);
