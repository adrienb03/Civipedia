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
    const { pseudo, first_name, last_name, email, password, phone, organization } = body
    if (!pseudo || !first_name || !last_name || !email || !password) return NextResponse.json({ error: 'invalid' }, { status: 400 })

    const hashed = await bcrypt.hash(password, 10)
    const fullName = `${first_name} ${last_name}`
    const data = await db
      .insert(users)
      .values({ name: fullName, pseudo, first_name, last_name, email, password: hashed, phone: phone || null, organization: organization || null })
      .returning({ id: users.id, name: users.name, email: users.email, pseudo: users.pseudo, first_name: users.first_name, last_name: users.last_name, phone: users.phone, organization: users.organization })

    const user = data[0]

    const cookieStore = await cookies()
    await setAuthCookies(cookieStore, user)

    return NextResponse.json({ ok: true, id: String(user.id), name: user.name, email: user.email, pseudo: user.pseudo, first_name: user.first_name, last_name: user.last_name, phone: user.phone, organization: user.organization })
  } catch (err) {
    console.error('test-signup error', err)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
