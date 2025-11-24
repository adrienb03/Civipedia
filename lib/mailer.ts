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

  // 1) Try SendGrid if configured
  if (SENDGRID_API_KEY) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(SENDGRID_API_KEY)
      const msg = { to, from: FROM, subject, text, html }
      const res = await sgMail.send(msg)
      // In non-production, include resetUrl in the returned info for convenience
      if (process.env.NODE_ENV !== 'production') {
        try {
          if (Array.isArray(res)) {
            res[0] = Object.assign({}, res[0], { resetUrl })
          } else if (res && typeof res === 'object') {
            res.resetUrl = resetUrl
          }
        } catch (e) {
          // ignore
        }
      }
      return { ok: true, info: res }
    } catch (e) {
      console.error('SendGrid send failed:', e)
      // fallthrough to other methods
    }
  }

  // 2) Try SMTP (MailHog in dev or configured SMTP host)
  const MAILHOG_HOST = process.env.MAILHOG_HOST
  const MAILHOG_PORT = process.env.MAILHOG_PORT ? parseInt(process.env.MAILHOG_PORT) : 1025
  // In dev, allow a default SMTP on localhost:1025 so MailHog works even without env vars
  const smtpHost = MAILHOG_HOST || (process.env.NODE_ENV !== 'production' ? 'localhost' : undefined)
  if (smtpHost) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer')
      const transporter = nodemailer.createTransport({ host: smtpHost, port: MAILHOG_PORT, secure: false })
      console.log(`Attempting SMTP send via ${smtpHost}:${MAILHOG_PORT}`)
      const info = await transporter.sendMail({ from: FROM, to, subject, text, html })
      // expose resetUrl in dev so the client can auto-redirect when using MailHog
      if (process.env.NODE_ENV !== 'production') {
        try {
          info.resetUrl = resetUrl
        } catch (e) {
          // ignore
        }
      }
      return { ok: true, info }
    } catch (e) {
      console.error('SMTP send failed:', e)
      // fallthrough to mock
    }
  }

  // 3) Mock mode: log in dev and return resetUrl
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
