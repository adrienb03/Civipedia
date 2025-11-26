// scripts/migrate_add_password_reset.js
// Migration: create password_reset_tokens table if missing

const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'local.db')
console.log('DB path:', DB_PATH)

const db = new Database(DB_PATH)

const sql = `
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);
`

try {
  db.exec(sql)
  console.log('password_reset_tokens table ensured')
} catch (e) {
  console.error('Migration failed:', e)
  process.exit(1)
}

console.log('Migration completed')
