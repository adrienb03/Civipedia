// scripts/migrate_add_reset_request_logs.js
// Migration: create reset_request_logs table if missing

const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'local.db')
console.log('DB path:', DB_PATH)

const db = new Database(DB_PATH)

const sql = `
CREATE TABLE IF NOT EXISTS reset_request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT,
  ip TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);
`

try {
  db.exec(sql)
  console.log('reset_request_logs table ensured')
} catch (e) {
  console.error('Migration failed:', e)
  process.exit(1)
}

console.log('Migration completed')
