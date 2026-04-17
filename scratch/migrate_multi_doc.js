const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS account_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );
`);

// Try to migrate existing data if possible
try {
  const existingDocs = db.prepare("SELECT id, document_path FROM accounts WHERE document_path IS NOT NULL AND document_path != ''").all();
  for (const doc of existingDocs) {
    db.prepare("INSERT INTO account_documents (account_id, file_path, file_name) VALUES (?, ?, ?)")
      .run(doc.id, doc.document_path, 'Initial Document');
  }
} catch (e) {
  console.log('No old document_path to migrate or table missing.');
}

console.log('Migration to multi-document support finished!');
