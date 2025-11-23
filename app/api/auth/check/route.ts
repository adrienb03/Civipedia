import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getSessionFromCookieStore, clearAuthCookies, setAuthCookies } from '@/lib/server/auth'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = await getSessionFromCookieStore(cookieStore)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Récupérer les vraies données utilisateur depuis la base
    const userData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (userData.length === 0) {
      // Supprimer les cookies invalides
      clearAuthCookies(cookieStore)
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const user = userData[0]

    // Return user info — the client can use this instead of reading cookies
    return NextResponse.json({
      id: user.id.toString(),
      name: user.name,
      email: user.email
    })

  } catch (error) {
    console.error('Error in auth check:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}