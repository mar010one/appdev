// One-shot: apply the income-table migration via Supabase Management API.
//
// Usage (from project root):
//   node scripts/apply-income-migration.mjs <SUPABASE_ACCESS_TOKEN>
// or with env:
//   $env:SUPABASE_ACCESS_TOKEN = "sbp_xxxxx" ; node scripts/apply-income-migration.mjs
//
// Get an access token at: https://supabase.com/dashboard/account/tokens
// (this is NOT the service-role key — it's a personal access token).
//
// Project ref defaults to the same one used by apply-notes-migration.mjs;
// override with SUPABASE_PROJECT_REF if you target a different project.

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'agivntinmsxzebhwczri';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.argv[2];

if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN env or first arg.');
  console.error('Get one at https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const sql = `
-- Income: every payout we received from an ad network
CREATE TABLE IF NOT EXISTS public.income (
  id BIGSERIAL PRIMARY KEY,
  network TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  currency TEXT NOT NULL,
  exchange_rate DOUBLE PRECISION NOT NULL,
  amount_mad DOUBLE PRECISION NOT NULL,
  amount_usd DOUBLE PRECISION NOT NULL,
  income_date TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS income_network_idx ON public.income(network);
CREATE INDEX IF NOT EXISTS income_date_idx    ON public.income(income_date DESC);

ALTER TABLE public.income DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.income TO anon;
GRANT ALL ON SEQUENCE public.income_id_seq TO anon;

INSERT INTO public.settings (key, value) VALUES
  ('income_split_pct_marwan', '50'),
  ('income_split_note',
   'After the network pays out, we split each payout between Marwan & Abdsamad. A portion is reinvested into ads, new accounts and tooling — the rest goes to each partner''s personal account.')
ON CONFLICT (key) DO NOTHING;

-- Force PostgREST to refresh its schema cache so the new table is visible immediately
NOTIFY pgrst, 'reload schema';
`;

console.log(`Applying income migration to project ${PROJECT_REF}…`);

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
console.log('\n✓ Migration applied. Refresh /income — the schema-cache error should be gone.');
