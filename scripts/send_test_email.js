#!/usr/bin/env node
// scripts/send_test_email.js
// Usage: node scripts/send_test_email.js recipient@example.com

const sgMail = require('@sendgrid/mail')

const to = process.argv[2] || process.env.TEST_EMAIL
if (!to) {
  console.error('Usage: node scripts/send_test_email.js recipient@example.com')
  process.exit(1)
}

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM = process.env.SENDGRID_FROM || 'no-reply@civipedia.local'

if (!SENDGRID_API_KEY) {
  console.error('Environment variable SENDGRID_API_KEY is not set.')
  process.exit(2)
}

sgMail.setApiKey(SENDGRID_API_KEY)

const msg = {
  to,
  from: SENDGRID_FROM,
  subject: 'Civipedia — Test d’envoi SendGrid',
  text: `Ceci est un e-mail de test envoyé par la configuration SendGrid de Civipedia.\n\nSi vous recevez ceci, l'envoi est correctement configuré.`,
  html: `<p>Ceci est un e-mail de test envoyé par la configuration <strong>SendGrid</strong> de Civipedia.</p><p>Si vous recevez ceci, l'envoi est correctement configuré.</p>`,
}

sgMail.send(msg)
  .then(() => {
    console.log('OK — e-mail envoyé à', to)
    process.exit(0)
  })
  .catch((err) => {
    console.error('Erreur lors de l’envoi :')
    // Print SendGrid response body if present for debugging
    if (err && err.response && err.response.body) console.error(err.response.body)
    else console.error(err)
    process.exit(3)
  })
