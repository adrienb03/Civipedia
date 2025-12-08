import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
import { getSessionFromCookieStore } from '@/lib/server/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = await getSessionFromCookieStore(cookieStore)
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const userData = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    if (!userData || userData.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 401 })

    const user = userData[0]
    // Only allow the specific admin email
    if (user.email !== 'admin@gmail.com') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const uploadsDir = path.join(process.cwd(), 'uploads')
    let files: Array<{ name: string; size: number; mtime: number }> = []
    try {
      const entries = await fs.promises.readdir(uploadsDir)
      for (const f of entries) {
        const stat = await fs.promises.stat(path.join(uploadsDir, f))
        if (stat.isFile()) files.push({ name: f, size: stat.size, mtime: stat.mtimeMs })
      }
    } catch (e) {
      // if folder doesn't exist, return empty list
      files = []
    }

    return NextResponse.json({ files })
  } catch (err: any) {
    console.error('Error listing uploads:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
