// scripts/init_db.js
// Initialize local SQLite database: create required tables if missing.

const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'local.db')
console.log('[init_db] Using DB at', DB_PATH)

const db = new Database(DB_PATH)

const stmts = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pseudo TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone TEXT,
    organization TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );`,

  `CREATE TABLE IF NOT EXISTS reset_request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT,
    ip TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );`,

  `CREATE TABLE IF NOT EXISTS anon_counters (
    id TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT 0
  );`
]

try {
  db.exec('BEGIN')
  for (const s of stmts) {
    db.exec(s)
  }
  db.exec('COMMIT')
  console.log('[init_db] All tables ensured')
} catch (e) {
  console.error('[init_db] Failed to initialize DB:', e)
  try { db.exec('ROLLBACK') } catch (_) {}
  process.exit(1)
} finally {
  db.close()
}
