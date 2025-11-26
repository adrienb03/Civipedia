// Route API: /api/auth/check
// Fonction pour vérifier la session utilisateur côté serveur
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getSessionFromCookieStore, clearAuthCookies, setAuthCookies } from '@/lib/server/auth'

export async function GET() {
  try {
    const cookieStore = await cookies()
    // Lire la cookie de session et obtenir l'ID utilisateur
    const userId = await getSessionFromCookieStore(cookieStore)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Récupérer les vraies données utilisateur depuis la base
    const userData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        pseudo: users.pseudo,
        first_name: users.first_name,
        last_name: users.last_name,
        phone: users.phone,
        organization: users.organization,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (userData.length === 0) {
      // Si l'utilisateur n'existe plus en base, nettoyer les cookies
      // pour éviter d'avoir un état stale côté client
      clearAuthCookies(cookieStore)
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const user = userData[0]

    // Return user info — the client can use this instead of reading cookies
    return NextResponse.json({
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      pseudo: user.pseudo ?? null,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      phone: user.phone ?? null,
      organization: user.organization ?? null,
    })

  } catch (error) {
    console.error('Error in auth check:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}