// scripts/migrate_add_anon_counters.js
// Migration simple: ajoute la table `anon_counters` si elle n'existe pas.

const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'local.db')
console.log('DB path:', DB_PATH)

const db = new Database(DB_PATH)

const sql = `
CREATE TABLE IF NOT EXISTS anon_counters (
  id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);
`

try {
  db.exec(sql)
  console.log('anon_counters table ensured')
} catch (e) {
  console.error('Migration failed:', e)
  process.exit(1)
}

console.log('Migration completed')
