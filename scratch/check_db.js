const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

const columns = db.prepare("PRAGMA table_info(accounts)").all();
console.log('Accounts Columns:', columns.map(c => c.name));

const appColumns = db.prepare("PRAGMA table_info(apps)").all();
console.log('Apps Columns:', appColumns.map(c => c.name));
