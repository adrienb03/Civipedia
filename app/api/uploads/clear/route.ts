import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
import { getSessionFromCookieStore } from '@/lib/server/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const userId = await getSessionFromCookieStore(cookieStore)
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const userData = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    if (!userData || userData.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 401 })

    const user = userData[0]
    const allowedAdmins = ['admin@gmail.com', 'admin2@gmail.com']
    if (!allowedAdmins.includes(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const uploadsDir = path.join(process.cwd(), 'uploads')
    let deleted = 0

    try {
      const entries = await fs.promises.readdir(uploadsDir)
      for (const f of entries) {
        const filePath = path.join(uploadsDir, f)
        try {
          const stat = await fs.promises.stat(filePath)
          if (stat.isFile()) {
            await fs.promises.unlink(filePath)
            deleted++
          }
        } catch (e) {
          // ignore individual file errors
          console.warn('Could not delete file', filePath, e)
        }
      }
    } catch (e) {
      // if directory doesn't exist, nothing to delete
      deleted = 0
    }

    return NextResponse.json({ deleted })
  } catch (err: any) {
    console.error('Error clearing uploads:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
