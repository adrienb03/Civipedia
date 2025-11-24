// Route API: /api/auth/logout — déconnexion
// Fonction pour effacer les cookies de session côté serveur
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { clearAuthCookies } from '@/lib/server/auth'

export async function POST() {
  try {
    // Récupérer le store de cookies fourni par Next
    const cookieStore = await cookies()
    // Log pour debug serveur
    console.log('API /api/auth/logout called: clearing cookies on server')
    // Effacer les cookies de session (server-side)
    await clearAuthCookies(cookieStore)
    console.log('API /api/auth/logout: cookies cleared')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error during logout API:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
