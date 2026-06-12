// One-shot: enable Row-Level Security on all public tables via the
// Supabase Management API. Closes the "rls_disabled_in_public" advisor errors.
//
// Usage (from project root):
//   node scripts/enable-rls.mjs <SUPABASE_ACCESS_TOKEN>
// or with env:
//   $env:SUPABASE_ACCESS_TOKEN = "sbp_xxxxx" ; node scripts/enable-rls.mjs
//
// Get an access token at: https://supabase.com/dashboard/account/tokens
// (this is NOT the service-role key — it's a personal access token, sbp_…).
//
// Safe because every table access goes through service-role server actions
// (which bypass RLS); the browser anon key only touches Auth + Storage.

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'agivntinmsxzebhwczri';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.argv[2];

if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN env or first arg.');
  console.error('Get one at https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const TABLES = [
  'accounts', 'account_documents', 'apps', 'versions', 'app_screenshots',
  'version_screenshots', 'listing_versions', 'expenses', 'income', 'settings',
  'companies', 'company_documents', 'tutorials', 'missions', 'websites',
  'nitch', 'notes', 'user_preferences',
];

const sql = `
${TABLES.map((t) => `ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`).join('\n')}

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

NOTIFY pgrst, 'reload schema';
`;

console.log(`Enabling RLS on ${TABLES.length} tables in project ${PROJECT_REF}…`);

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
console.log('\n✓ RLS enabled. Re-run the Security Advisor — the errors should be gone.');
