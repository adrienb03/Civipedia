// POST /api/auth/confirm-reset
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { users, password_reset_tokens } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = (body?.token || '').toString()
    const newPassword = (body?.newPassword || '').toString()
    if (!token || !newPassword) return NextResponse.json({ error: 'invalid' }, { status: 400 })

    const tokenHash = hashToken(token)
    const now = Date.now()

    const rows = await db.select().from(password_reset_tokens).where(eq(password_reset_tokens.token_hash, tokenHash)).limit(1)
    if (rows.length === 0) return NextResponse.json({ error: 'invalid' }, { status: 400 })

    const t = rows[0]
    if (t.used) return NextResponse.json({ error: 'used' }, { status: 400 })
    if (t.expires_at < now) return NextResponse.json({ error: 'expired' }, { status: 400 })

    // Update user password
    const hashed = await bcrypt.hash(newPassword, 10)
    await db.update(users).set({ password: hashed }).where(eq(users.id, t.user_id))

    // Fetch user's email to store briefly in a secure cookie so the login
    // action can enforce that the user logs in with the account email used
    // during signup. Cookie is short-lived and HttpOnly.
    const userRows = await db.select().from(users).where(eq(users.id, t.user_id)).limit(1)
    const userEmail = userRows.length > 0 ? userRows[0].email : null

    // Mark token used and optionally remove other tokens
    await db.update(password_reset_tokens).set({ used: 1 }).where(eq(password_reset_tokens.id, t.id))
    await db.delete(password_reset_tokens).where(eq(password_reset_tokens.user_id, t.user_id))

    // Optionally: invalidate existing sessions (not implemented centrally here)

    try {
      const cookieStore = cookies()
      if (userEmail) {
        cookieStore.set('recent_reset_email', String(userEmail), { httpOnly: true, path: '/', maxAge: 60 * 5, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.debug('Could not set recent_reset_email cookie', e)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('confirm-reset error:', e)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
