import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.sqlite');
console.log('Connecting to database at:', dbPath);

let db: Database.Database;
try {
  db = new Database(dbPath);
} catch (error) {
  console.error('CRITICAL: Failed to open database:', error);
  throw error;
}

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- google_play, apple_store
    developer_name TEXT,
    developer_id TEXT,
    email TEXT NOT NULL,
    website TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS account_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    short_description TEXT,
    long_description TEXT,
    icon_small_path TEXT,
    icon_large_path TEXT,
    store_url TEXT,
    contact_email TEXT,
    privacy_url TEXT,
    website_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL,
    version_number TEXT NOT NULL,
    changelog TEXT,
    file_path TEXT,
    release_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS app_screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS version_screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (version_id) REFERENCES versions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS listing_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payer TEXT NOT NULL,
    description TEXT,
    category TEXT,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    exchange_rate REAL NOT NULL,
    amount_mad REAL NOT NULL,
    amount_usd REAL NOT NULL,
    expense_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ice TEXT,
    duns TEXT,
    ded TEXT,
    id_front_path TEXT,
    id_back_path TEXT,
    company_doc_path TEXT,
    has_id INTEGER DEFAULT 0,
    linked_account_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (linked_account_id) REFERENCES accounts(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS company_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    doc_type TEXT DEFAULT 'other',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tutorials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'link',
    file_path TEXT,
    file_name TEXT,
    url TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT,
    due_date TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'normal',
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed a default USD->MAD rate if none exists yet.
const existingRate = db.prepare("SELECT value FROM settings WHERE key = 'usd_mad_rate'").get();
if (!existingRate) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('usd_mad_rate', '10.00')").run();
}

// --- Lightweight migrations: add columns that may not exist on older DBs ---
function ensureColumn(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn('apps', 'contact_email', 'TEXT');
ensureColumn('apps', 'privacy_url', 'TEXT');
ensureColumn('apps', 'website_url', 'TEXT');
// Lifecycle status: draft (default) | live | removed | rejected | suspended | closed
ensureColumn('apps', 'status', "TEXT DEFAULT 'draft'");

// Developer account secure info & company
ensureColumn('accounts', 'company_name', 'TEXT');
ensureColumn('accounts', 'dev_password', 'TEXT');
ensureColumn('accounts', 'dev_2fa_secret', 'TEXT');
ensureColumn('accounts', 'dev_security_notes', 'TEXT');

// Expenses payment status: paid (cash already out) vs pending (a kridi / IOU commitment)
ensureColumn('expenses', 'payment_status', "TEXT DEFAULT 'paid'");

// Per-version assets: snapshot of the icon and promo at that release
ensureColumn('versions', 'icon_path', 'TEXT');
ensureColumn('versions', 'promo_path', 'TEXT');

// Listing version may optionally link to a binary release's AAB / IPA
ensureColumn('listing_versions', 'release_file_path', 'TEXT');

// VCC (Virtual Credit Card) used for opening Google Play developer accounts
ensureColumn('accounts', 'vcc_number', 'TEXT');
ensureColumn('accounts', 'vcc_holder', 'TEXT');
ensureColumn('accounts', 'vcc_expiry', 'TEXT');
ensureColumn('accounts', 'vcc_cvv', 'TEXT');
ensureColumn('accounts', 'vcc_notes', 'TEXT');

// Company usage status: not_used | used (tracks if company was used to open a Google Play account)
ensureColumn('companies', 'status', "TEXT DEFAULT 'not_used'");

export default db;
