const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
try {
  db.exec("ALTER TABLE accounts ADD COLUMN status TEXT DEFAULT 'active'");
  console.log('Status column added');
} catch(e) {
  if (e.message.includes('duplicate column name')) {
    console.log('Status column already exists');
  } else {
    console.error(e);
  }
}
