// One-shot: apply notes-migration.sql via Supabase Management API.
// Reads the SBP access token from env (SUPABASE_ACCESS_TOKEN) or arg.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQL_PATH = resolve(__dirname, '..', 'notes-migration.sql');
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'agivntinmsxzebhwczri';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.argv[2];

if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN env or first arg.');
  process.exit(1);
}

const sql = readFileSync(SQL_PATH, 'utf8');

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
