import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { clearAuthCookies } from '@/lib/server/auth'

export async function POST() {
  try {
    const cookieStore = await cookies()
    console.log('API /api/auth/logout called: clearing cookies on server')
    await clearAuthCookies(cookieStore)
    console.log('API /api/auth/logout: cookies cleared')
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error during logout API:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
