import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
import { getSessionFromCookieStore } from '@/lib/server/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = await getSessionFromCookieStore(cookieStore)
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const userData = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    if (!userData || userData.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 401 })

    const user = userData[0]
    if (user.email !== 'admin@gmail.com') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Robustly extract filename from the request URL as fallback if params are missing
    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    let name = segments[segments.length - 1]
    try { name = decodeURIComponent(name) } catch (e) { /* ignore */ }

    if (!name) return NextResponse.json({ error: 'Missing file name' }, { status: 400 })

    // Prevent path traversal by using basename
    const safeName = path.basename(name)

    const uploadsDir = path.join(process.cwd(), 'uploads')
    const filePath = path.join(uploadsDir, safeName)
    try {
      await fs.promises.access(filePath, fs.constants.R_OK)
    } catch (e) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileBuffer = await fs.promises.readFile(filePath)
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}"`,
      },
    })
  } catch (err: any) {
    console.error('Error serving upload:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
