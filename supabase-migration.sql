-- ============================================================
-- Supabase Migration: AppDev Account & App Management Tool
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounts (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  developer_name TEXT,
  developer_id TEXT,
  email TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  company_name TEXT,
  dev_password TEXT,
  dev_2fa_secret TEXT,
  dev_security_notes TEXT,
  vcc_number TEXT,
  vcc_holder TEXT,
  vcc_expiry TEXT,
  vcc_cvv TEXT,
  vcc_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_documents (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apps (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  package_name TEXT,
  category TEXT,
  short_description TEXT,
  long_description TEXT,
  icon_small_path TEXT,
  icon_large_path TEXT,
  store_url TEXT,
  contact_email TEXT,
  privacy_url TEXT,
  website_url TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE apps ADD COLUMN IF NOT EXISTS package_name TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
UPDATE apps SET status_updated_at = COALESCE(status_updated_at, created_at, NOW())
  WHERE status_updated_at IS NULL;

CREATE TABLE IF NOT EXISTS versions (
  id BIGSERIAL PRIMARY KEY,
  app_id BIGINT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  changelog TEXT,
  file_path TEXT,
  icon_path TEXT,
  promo_path TEXT,
  release_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_screenshots (
  id BIGSERIAL PRIMARY KEY,
  app_id BIGINT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS version_screenshots (
  id BIGSERIAL PRIMARY KEY,
  version_id BIGINT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listing_versions (
  id BIGSERIAL PRIMARY KEY,
  app_id BIGINT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  name TEXT,
  short_description TEXT,
  long_description TEXT,
  icon_small_path TEXT,
  icon_large_path TEXT,
  store_url TEXT,
  contact_email TEXT,
  privacy_url TEXT,
  website_url TEXT,
  screenshots_json TEXT,
  release_file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id BIGSERIAL PRIMARY KEY,
  payer TEXT NOT NULL,
  description TEXT,
  category TEXT,
  amount DOUBLE PRECISION NOT NULL,
  currency TEXT NOT NULL,
  exchange_rate DOUBLE PRECISION NOT NULL,
  amount_mad DOUBLE PRECISION NOT NULL,
  amount_usd DOUBLE PRECISION NOT NULL,
  expense_date TEXT,
  payment_status TEXT DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Seed default USD→MAD exchange rate
INSERT INTO settings (key, value) VALUES ('usd_mad_rate', '10.00')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS companies (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  ice TEXT,
  duns TEXT,
  ded TEXT,
  id_front_path TEXT,
  id_back_path TEXT,
  company_doc_path TEXT,
  has_id INTEGER DEFAULT 0,
  linked_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT DEFAULT 'not_used',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_documents (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  doc_type TEXT DEFAULT 'other',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tutorials (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'link',
  file_path TEXT,
  file_name TEXT,
  url TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS missions (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  due_date TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS websites (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nitch (
  id BIGSERIAL PRIMARY KEY,
  keyword TEXT NOT NULL,
  url TEXT NOT NULL,
  note TEXT,
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  color TEXT DEFAULT 'default',
  is_shared BOOLEAN DEFAULT FALSE,
  shared_with TEXT,
  owner_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notes_owner_email_idx ON notes(owner_email);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_email TEXT NOT NULL,
  pref_key TEXT NOT NULL,
  pref_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_email, pref_key)
);

-- ── Disable RLS (internal tool — no user-specific row filtering needed) ────────

ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE account_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE apps DISABLE ROW LEVEL SECURITY;
ALTER TABLE versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_screenshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE version_screenshots DISABLE ROW LEVEL SECURITY;
ALTER TABLE listing_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE tutorials DISABLE ROW LEVEL SECURITY;
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;
ALTER TABLE websites DISABLE ROW LEVEL SECURITY;
ALTER TABLE nitch DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;

-- ── Grant anon role full access (allows publishable key to work) ───────────────

GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ── Storage bucket ────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('uploads', 'uploads', true, 524288000)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (allow all operations on the uploads bucket)
DROP POLICY IF EXISTS "uploads_select" ON storage.objects;
CREATE POLICY "uploads_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads_insert" ON storage.objects;
CREATE POLICY "uploads_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads_update" ON storage.objects;
CREATE POLICY "uploads_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'uploads');

DROP POLICY IF EXISTS "uploads_delete" ON storage.objects;
CREATE POLICY "uploads_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'uploads');
