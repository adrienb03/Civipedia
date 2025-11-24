// POST /api/auth/request-reset
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { users, password_reset_tokens, reset_request_logs } from '@/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import crypto from 'crypto'
import { sendResetEmail } from '@/lib/mailer'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'

const TOKEN_EXPIRY_MS = 1000 * 60 * 60 // 1 hour

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const identifier = (body?.identifier || '').toString().trim()
    const recaptchaToken = (body?.recaptchaToken || '').toString()
    if (!identifier) return NextResponse.json({ ok: true })

    // Rate-limiting: limit requests per identifier and per IP over last window
    const ip = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('x-forwarded') || 'unknown').toString().split(',')[0].trim()
    const now = Date.now()
    const windowMs = 1000 * 60 * 60 // 1 hour window
    const cutoff = now - windowMs

    // Count recent requests by identifier
    const recentByIdentifier = await db.select().from(reset_request_logs).where(and(eq(reset_request_logs.identifier, identifier), gt(reset_request_logs.created_at, cutoff))).all()
    if (recentByIdentifier.length >= 5) {
      // Too many requests for this identifier — return generic OK
      return NextResponse.json({ ok: true })
    }

    // Count recent requests by IP
    const recentByIp = await db.select().from(reset_request_logs).where(and(eq(reset_request_logs.ip, ip), gt(reset_request_logs.created_at, cutoff))).all()
    if (recentByIp.length >= 20) {
      return NextResponse.json({ ok: true })
    }

    // If reCAPTCHA secret is configured, require and verify token
    const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || ''
    if (RECAPTCHA_SECRET) {
      if (!recaptchaToken) return NextResponse.json({ ok: true })
      try {
        const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ secret: RECAPTCHA_SECRET, response: recaptchaToken })
        })
        const verifyJson = await verifyRes.json()
        if (!verifyJson.success) {
          return NextResponse.json({ ok: true })
        }
      } catch (e) {
        console.error('reCAPTCHA verify error', e)
        return NextResponse.json({ ok: true })
      }
    }

    // Log this request (for rate-limiting/audit)
    try {
      await db.insert(reset_request_logs).values({ identifier, ip, created_at: Date.now() })
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.debug('Could not log reset request', e)
    }

    // Find user by email (case-insensitive)
    const rows = await db.select().from(users).where(eq(users.email, identifier)).limit(1)
    if (rows.length === 0) {
      // Respond generically to avoid user enumeration
      return NextResponse.json({ ok: true })
    }

    const user = rows[0]
    // Generate token
    const token = crypto.randomBytes(32).toString('base64url')
    const tokenHash = hashToken(token)
    const expiresAt = Date.now() + TOKEN_EXPIRY_MS

    // Store token hash in DB
    await db.insert(password_reset_tokens).values({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt, used: 0, created_at: Date.now() })

    // Send email (mock if no key)
    const sendRes = await sendResetEmail(user.email, token)

    // For security, return generic OK message. In dev we may include the resetUrl
    // but only when the request originates from localhost to avoid leaking the
    // reset link to remote requesters (e.g. an attacker calling the API remotely).
    let infoToReturn: any = undefined
    if (process.env.NODE_ENV !== 'production' && sendRes?.info) {
      const localIps = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'])
      if (localIps.has(ip)) {
        infoToReturn = sendRes.info
      } else {
        // Do not return resetUrl to remote clients; log for debugging
        if (process.env.NODE_ENV !== 'production') console.debug('Reset requested from non-local IP; not returning resetUrl in response', ip)
      }
    }

    return NextResponse.json({ ok: true, info: infoToReturn })
  } catch (e) {
    console.error('request-reset error:', e)
    return NextResponse.json({ ok: true })
  }
}
