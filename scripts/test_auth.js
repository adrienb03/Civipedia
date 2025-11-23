// Script utilitaire de test: vérifie rapidement les routes d'auth
// Fonction pour tester /api/auth endpoints en local
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const fetch = global.fetch || require('node-fetch')
const path = require('path')

async function run() {
  const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'local.db')
  console.log('Using DB at', DB_PATH)

  const db = new Database(DB_PATH)

  // Create table if not exists (in case DB empty)
  db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )`)

  const email = `test+${Date.now()}@example.com`
  const name = 'Test User'
  const rawPassword = 'Password123!'
  const hashed = bcrypt.hashSync(rawPassword, 10)

  const insert = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)')
  const info = insert.run(name, email, hashed)
  const userId = info.lastInsertRowid
  console.log('Inserted user', { id: userId, email })

  // Call /api/auth/check with cookie
  const base = 'http://localhost:3000'
  console.log('\n==> Checking session with cookie user_id=' + userId)
  let res = await fetch(base + '/api/auth/check', {
    headers: {
      Cookie: `user_id=${userId}`
    }
  })
  console.log('Status:', res.status)
  try {
    const json = await res.json()
    console.log('Body:', json)
  } catch (e) {
    console.log('No JSON body')
  }

  // Call logout
  console.log('\n==> Calling logout')
  res = await fetch(base + '/api/auth/logout', {
    method: 'POST',
    headers: {
      Cookie: `user_id=${userId}`
    }
  })
  console.log('Logout status:', res.status)
  console.log('Response headers:')
  for (const [k, v] of res.headers) {
    if (k.toLowerCase() === 'set-cookie') {
      console.log('Set-Cookie:', v)
    }
  }
  try { console.log('Body:', await res.json()) } catch(e){}

  // Check session again, without cookie
  console.log('\n==> Checking session without cookie')
  res = await fetch(base + '/api/auth/check')
  console.log('Status:', res.status)
  try { console.log('Body:', await res.json()) } catch(e){}

  db.close()
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
