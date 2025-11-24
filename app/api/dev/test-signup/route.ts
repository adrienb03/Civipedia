// Route de test dev: /api/dev/test-signup
// Fonction pour simuler la création d'un utilisateur en environnement dev
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { users } from '@/db/schema'
import { cookies } from 'next/headers'
import { COOKIE_OPTIONS, setAuthCookies } from '@/lib/server/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password } = body
    if (!name || !email || !password) return NextResponse.json({ error: 'invalid' }, { status: 400 })

    const hashed = await bcrypt.hash(password, 10)
    const data = await db.insert(users).values({ name, email, password: hashed }).returning({ id: users.id, name: users.name, email: users.email })
    const user = data[0]

    const cookieStore = await cookies()
    await setAuthCookies(cookieStore, user)

    return NextResponse.json({ ok: true, id: String(user.id), name: user.name, email: user.email })
  } catch (err) {
    console.error('test-signup error', err)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
