import { NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { cookies } from 'next/headers'
import { setAuthCookies } from '@/lib/server/auth'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body
    if (!email || !password) return NextResponse.json({ error: 'invalid' }, { status: 400 })

    const userData = await db.select().from(users).where(eq(users.email, email.toString())).limit(1)
    if (userData.length === 0) return NextResponse.json({ error: 'invalid' }, { status: 401 })

    const user = userData[0]
    const ok = await bcrypt.compare(password.toString(), user.password)
    if (!ok) return NextResponse.json({ error: 'invalid' }, { status: 401 })

    const cookieStore = await cookies()
    await setAuthCookies(cookieStore, { id: user.id, name: user.name })

    return NextResponse.json({ ok: true, id: String(user.id), name: user.name, email: user.email })
  } catch (err) {
    console.error('test-login error', err)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
