// One-shot: create the `emails` table (the Email Vault) via the Supabase
// Management API.
//
// Usage (from project root):
//   node scripts/apply-emails-migration.mjs <SUPABASE_ACCESS_TOKEN>
// or with env:
//   $env:SUPABASE_ACCESS_TOKEN = "sbp_xxxxx" ; node scripts/apply-emails-migration.mjs
//
// Get an access token at: https://supabase.com/dashboard/account/tokens
// (this is NOT the service-role key — it's a personal access token, sbp_…).
//
// Security model matches every other table: access goes through service-role
// server actions (src/lib/actions.ts) which bypass RLS, so RLS is ON with no
// anon policy — the browser anon key can never read it.

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'agivntinmsxzebhwczri';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.argv[2];

if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN env or first arg.');
  console.error('Get one at https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const sql = `
CREATE TABLE IF NOT EXISTS public.emails (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  password TEXT,
  auth TEXT,
  note TEXT,
  image_path TEXT,
  phone TEXT,
  recovery_email TEXT,
  linked_account_id BIGINT REFERENCES public.accounts(id) ON DELETE SET NULL,
  linked_company_id BIGINT REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent column adds for projects created before these fields existed.
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS recovery_email TEXT;

CREATE INDEX IF NOT EXISTS emails_email_idx ON public.emails(LOWER(email));
CREATE INDEX IF NOT EXISTS emails_linked_account_idx ON public.emails(linked_account_id);

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.emails        FROM anon;
REVOKE ALL ON SEQUENCE public.emails_id_seq FROM anon;

-- Force PostgREST to refresh its schema cache so the new table is visible immediately
NOTIFY pgrst, 'reload schema';
`;

console.log(`Creating emails table in project ${PROJECT_REF}…`);

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  },
);

const text = await res.text();
console.log('Status:', res.status);
console.log(text);
if (!res.ok) process.exit(1);
console.log('\n✓ emails table created. The Email Vault now saves to a real table.');
