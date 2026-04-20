-- ============================================================
-- Notes feature — Supabase migration
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- Idempotent: safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  color TEXT DEFAULT 'default',
  is_shared BOOLEAN DEFAULT FALSE,
  shared_with TEXT,            -- comma-separated emails (empty + is_shared=true => shared with everyone)
  owner_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notes_owner_email_idx ON notes(owner_email);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx  ON notes(updated_at DESC);

ALTER TABLE notes DISABLE ROW LEVEL SECURITY;

GRANT ALL ON notes TO anon;
GRANT USAGE, SELECT ON SEQUENCE notes_id_seq TO anon;
