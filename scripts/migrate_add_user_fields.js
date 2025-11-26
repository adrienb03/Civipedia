// Migration helper: adds missing columns to `users` table safely
// Usage: node scripts/migrate_add_user_fields.js
const path = require('path')
const Database = require('better-sqlite3')

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'local.db')
console.log('DB path:', DB_PATH)
const db = new Database(DB_PATH)

function columnExists(table, column) {
  const rows = db.prepare("PRAGMA table_info('" + table + "')").all()
  return rows.some(r => r.name === column)
}

const cols = [
  { name: 'pseudo', type: 'TEXT' },
  { name: 'first_name', type: 'TEXT' },
  { name: 'last_name', type: 'TEXT' },
  { name: 'phone', type: 'TEXT' },
  { name: 'organization', type: 'TEXT' },
]

try {
  db.exec('BEGIN')
  for (const c of cols) {
    if (!columnExists('users', c.name)) {
      console.log(`Adding column ${c.name}`)
      db.exec(`ALTER TABLE users ADD COLUMN ${c.name} ${c.type}`)
    } else {
      console.log(`Column ${c.name} already exists`)
    }
  }
  db.exec('COMMIT')
  console.log('Migration completed')
} catch (err) {
  console.error('Migration error:', err)
  try { db.exec('ROLLBACK') } catch(e) {}
  process.exit(1)
} finally {
  db.close()
}
