#!/usr/bin/env node
// scripts/e2e_password_reset.js
// End-to-end test for password reset flow (dev).

const fetch = globalThis.fetch
const APP = process.env.APP_URL || 'http://localhost:3000'

async function post(path, body) {
  const res = await fetch(`${APP}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  return { status: res.status, json }
}

async function run() {
  const email = 'e2e-reset@example.com'
  const oldPass = 'OldPass123!'
  const newPass = 'NewPass123!'

  console.log('1) Create dev user via /api/dev/test-signup')
  const signup = await post('/api/dev/test-signup', {
    pseudo: 'e2e', first_name: 'E2E', last_name: 'Reset', email, password: oldPass, phone: null, organization: null
  })
  console.log('signup:', signup.status, signup.json)

  console.log('2) Request password reset')
  const req = await post('/api/auth/request-reset', { identifier: email })
  console.log('request-reset:', req.status, req.json)

  const resetUrl = req.json?.info?.resetUrl
  if (!resetUrl) {
    console.error('No resetUrl returned in dev mode. Check server logs or mailer mock.')
    process.exit(1)
  }

  // extract token param
  const url = new URL(resetUrl)
  const token = url.searchParams.get('token')
  if (!token) {
    console.error('No token in resetUrl')
    process.exit(1)
  }
  console.log('Extracted token:', token)

  console.log('3) Confirm reset with new password')
  const confirm = await post('/api/auth/confirm-reset', { token, newPassword: newPass })
  console.log('confirm-reset:', confirm.status, confirm.json)
  if (!confirm.json?.ok) {
    console.error('Confirm reset failed')
    process.exit(1)
  }

  console.log('4) Try login with new password via /api/dev/test-login')
  const login = await post('/api/dev/test-login', { email, password: newPass })
  console.log('login:', login.status, login.json)
  if (login.status === 200) {
    console.log('E2E password reset succeeded')
    process.exit(0)
  } else {
    console.error('E2E login failed after reset')
    process.exit(1)
  }
}

run().catch(e => { console.error(e); process.exit(1) })
