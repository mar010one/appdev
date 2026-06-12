-- ============================================================
-- SECURITY FIX: Enable Row-Level Security on all public tables
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard
--   → your project → SQL Editor → New query → paste → Run)
-- ============================================================
--
-- Why this is safe for this app:
--   • Every table read/write goes through server actions (src/lib/actions.ts)
--     using the SERVICE-ROLE key, which BYPASSES RLS — so the app keeps working.
--   • The browser only uses the ANON key for Supabase Auth + Storage uploads,
--     never for reading these tables.
--
-- With RLS enabled and NO policies, the anon role (your public, browser-shipped
-- key) is denied all access to these tables. service_role still has full access.
-- This is exactly what closes the "rls_disabled_in_public" advisor errors.

-- ── Enable RLS on every public table ──────────────────────────────────────────
ALTER TABLE public.accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_screenshots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.version_screenshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_versions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorials            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websites             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nitch                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences     ENABLE ROW LEVEL SECURITY;

-- ── Defense in depth: revoke the broad anon grants the old migration created ───
-- The anon key never needs direct table access (it only does Auth + Storage),
-- so strip the privileges entirely. RLS already blocks it; this removes the
-- grant too, for least-privilege.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Refresh PostgREST's schema cache so changes take effect immediately
NOTIFY pgrst, 'reload schema';
