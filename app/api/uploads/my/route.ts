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

    const uploadsDir = path.join(process.cwd(), 'uploads')
    const metaPath = path.join(uploadsDir, 'metadata.json')

    let entries: Array<{ name: string; size: number; mtime: number }> = []
    try {
      const files = await fs.promises.readdir(uploadsDir)
      for (const f of files) {
        if (f === 'metadata.json' || f.startsWith('.')) continue
        const stat = await fs.promises.stat(path.join(uploadsDir, f))
        if (stat.isFile()) entries.push({ name: f, size: stat.size, mtime: stat.mtimeMs })
      }
    } catch (e) {
      entries = []
    }

    let metadata: Record<string, any> = {}
    try {
      const raw = await fs.promises.readFile(metaPath, 'utf-8')
      metadata = JSON.parse(raw || '{}')
    } catch (e) {
      metadata = {}
    }

    // Filter entries by uploaderEmail
    const userFiles = entries
      .map((e) => ({
        safeName: e.name,
        size: e.size,
        mtime: e.mtime,
        originalName: metadata[e.name]?.originalName || e.name,
        uploadedAt: metadata[e.name]?.uploadedAt || null,
        status: metadata[e.name]?.status || 'pending',
        reviewedBy: metadata[e.name]?.reviewedBy || null,
        reviewedAt: metadata[e.name]?.reviewedAt || null,
        uploaderEmail: metadata[e.name]?.uploaderEmail || null,
      }))
      .filter((f) => f.uploaderEmail === user.email)

    // summary counts
    const total = userFiles.length
    const accepted = userFiles.filter((f) => f.status === 'accepted').length
    const refused = userFiles.filter((f) => f.status === 'refused').length

    return NextResponse.json({ files: userFiles, summary: { total, accepted, refused } })
  } catch (err: any) {
    console.error('Error listing user uploads:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
