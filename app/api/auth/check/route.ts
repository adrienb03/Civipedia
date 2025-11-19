import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('user_id')?.value
    const userName = cookieStore.get('user_name')?.value

    if (!userId || !userName) {
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
      .where(eq(users.id, parseInt(userId)))
      .limit(1)

    if (userData.length === 0) {
      // Supprimer les cookies invalides
      cookieStore.delete('user_id')
      cookieStore.delete('user_name')
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const user = userData[0]

    // Vérifier que le nom correspond
    if (user.name !== userName) {
      // Mettre à jour le cookie avec le vrai nom
      cookieStore.set('user_name', user.name, {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })
    }

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