// Script d'intégration: tests end-to-end signup/login/logout
// Fonction pour joindre les endpoints locaux et vérifier les cookies
const fetch = globalThis.fetch || (() => {
  try { return require('node-fetch') } catch (e) { throw new Error('No fetch available; install node-fetch or run on Node 18+') }
})()
const path = require('path')
const Database = require('better-sqlite3')

function extractCookies(res) {
  // node-fetch exposes raw(), but the global fetch in newer Node returns a Headers
  // object where you should use get('set-cookie'). Support both.
  const header = res.headers.get && res.headers.get('set-cookie')
  if (header) return header.split(',').map(s => s.split(';')[0]).join('; ')
  if (res.headers.raw) {
    const raw = res.headers.raw()['set-cookie'] || []
    return raw.map(s => s.split(';')[0]).join('; ')
  }
  return ''
}

async function postForm(url, fields, cookie, asJson = false) {
  let body
  const headers = {}
  if (asJson) {
    body = JSON.stringify(fields)
    headers['Content-Type'] = 'application/json'
  } else {
    const form = new URLSearchParams()
    for (const [k, v] of Object.entries(fields)) form.append(k, v)
    body = form
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  if (cookie) headers['Cookie'] = cookie

  // Envoyer la requête POST en tenant compte du type de payload
  const res = await fetch(url, { method: 'POST', body, headers, redirect: 'manual' })
  // Extraire l'entête Set-Cookie pour simuler le stockage cookie côté client
  const setCookie = extractCookies(res)
  return { res, setCookie }
}

async function getJson(url, cookie) {
  const headers = {}
  if (cookie) headers['Cookie'] = cookie
  // Appel GET simple (envoi optionnel d'un header Cookie)
  const res = await fetch(url, { headers })
  let json = null
  try { json = await res.json() } catch(e) {}
  return { res, json }
}

async function run() {
  const base = 'http://localhost:3000'

  console.log('=== Signup flow ===')
  const timestamp = Date.now()
  const email = `int+${timestamp}@example.com`
  const first_name = 'Int'
  const last_name = 'Test'
  const name = `${first_name} ${last_name}`
  const password = 'Password123!'

  // Provide required fields for the updated signup contract
  let r = await postForm(base + '/api/dev/test-signup', { pseudo: `int${timestamp}`, first_name, last_name, name, email, password }, null, true)
  console.log('Signup status', r.res.status)
  console.log('Signup set-cookie:', r.setCookie)

  // After signup, check session
  const cookie = r.setCookie
  let check = await getJson(base + '/api/auth/check', cookie)
  console.log('/api/auth/check status', check.res.status)
  console.log('body', check.json)

  console.log('\n=== Logout ===')
  let logout = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Cookie: cookie }, redirect: 'manual' })
  console.log('Logout status', logout.status)
  console.log('Logout set-cookie', extractCookies(logout))

  // Check after logout
  check = await getJson(base + '/api/auth/check')
  console.log('/api/auth/check (no cookie) status', check.res.status)
  console.log('body', check.json)

  console.log('\n=== Login flow ===')
  // Create user directly if needed
  const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'local.db')
  const db = new Database(DB_PATH)
  db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, pseudo TEXT, first_name TEXT, last_name TEXT, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, phone TEXT, organization TEXT)`) 
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (!exists) {
    const bcrypt = require('bcryptjs')
    const hashed = bcrypt.hashSync(password, 10)
    const info = db.prepare('INSERT INTO users (name,pseudo,first_name,last_name,email,password) VALUES (?,?,?,?,?,?)').run(name, `int${timestamp}`, first_name, last_name, email, hashed)
    console.log('Inserted user id', info.lastInsertRowid)
  }
  db.close()

  r = await postForm(base + '/api/dev/test-login', { email, password }, null, true)
  console.log('Login status', r.res.status)
  console.log('Login set-cookie:', r.setCookie)

  check = await getJson(base + '/api/auth/check', r.setCookie)
  console.log('/api/auth/check after login status', check.res.status)
  console.log('body', check.json)
}

run().catch(err => { console.error(err); process.exit(1) })
