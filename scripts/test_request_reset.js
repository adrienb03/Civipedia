#!/usr/bin/env node
// scripts/test_request_reset.js
// Usage: node scripts/test_request_reset.js you@example.com

const email = process.argv[2] || process.env.TEST_RESET_EMAIL || 'int+reset@example.com'
const url = process.env.APP_URL || 'http://localhost:3000'

async function run() {
  try {
    console.log(`Sending password reset request for: ${email} to ${url}/api/auth/request-reset`)
    const res = await fetch(`${url}/api/auth/request-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email }),
    })
    const data = await res.json()
    console.log('Status:', res.status)
    console.log('Response:', JSON.stringify(data, null, 2))

    if (data?.info?.resetUrl) {
      console.log('\nFound resetUrl (DEV):', data.info.resetUrl)
    }
  } catch (e) {
    console.error('Request failed:', e)
    process.exit(1)
  }
}

run()
