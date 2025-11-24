// lib/mailer.ts
// Minimal mailer helper. If SENDGRID_API_KEY is set, attempts to use @sendgrid/mail.
// Otherwise falls back to a mock that logs the reset token (useful for dev).

import crypto from 'crypto'

type SendResult = { ok: boolean; info?: any }

export async function sendResetEmail(to: string, token: string): Promise<SendResult> {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
  const FROM = process.env.SENDGRID_FROM || 'no-reply@civipedia.local'
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/reset/confirm?token=${encodeURIComponent(token)}`

  const subject = 'Réinitialisation de votre mot de passe Civipedia'
  const text = `Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien suivant pour définir un nouveau mot de passe (valide 1 heure):\n\n${resetUrl}\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez ce message.`
  const html = `<p>Bonjour,</p><p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien suivant pour définir un nouveau mot de passe (valide 1 heure):</p><p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p><p>Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.</p>`

  if (!SENDGRID_API_KEY) {
    // Mock mode: log to server console and return the token in dev for testing
    if (process.env.NODE_ENV !== 'production') {
      console.log('--- Mock sendResetEmail ---')
      console.log('To:', to)
      console.log('Reset URL:', resetUrl)
      console.log('Token (raw):', token)
      console.log('---------------------------')
      return { ok: true, info: { mock: true, resetUrl } }
    }
    return { ok: false }
  }

  // If SendGrid is available, try to send
  try {
    // Dynamic import to avoid adding dependency unless used
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(SENDGRID_API_KEY)
    const msg = {
      to,
      from: FROM,
      subject,
      text,
      html,
    }
    const res = await sgMail.send(msg)
    return { ok: true, info: res }
  } catch (e) {
    console.error('SendGrid send failed:', e)
    return { ok: false, info: e }
  }
}
