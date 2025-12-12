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
    // Allow specific admin emails
    const allowedAdmins = ['admin@gmail.com', 'admin2@gmail.com']
    if (!allowedAdmins.includes(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const uploadsDir = path.join(process.cwd(), 'uploads')
    const metaPath = path.join(uploadsDir, 'metadata.json')
    let files: Array<{ name: string; size: number; mtime: number; status?: string; reviewedBy?: string | null; reviewedAt?: number | null }> = []
    try {
      const entries = await fs.promises.readdir(uploadsDir)
      for (const f of entries) {
        // skip metadata file and hidden files
        if (f === 'metadata.json' || f.startsWith('.')) continue
        const stat = await fs.promises.stat(path.join(uploadsDir, f))
        if (stat.isFile()) files.push({ name: f, size: stat.size, mtime: stat.mtimeMs })
      }
    } catch (e) {
      // if folder doesn't exist, return empty list
      files = []
    }

    // read metadata if present and attach statuses
    let metadata: Record<string, { status?: string; reviewedBy?: string | null; reviewedAt?: number | null }> = {}
    try {
      const raw = await fs.promises.readFile(metaPath, 'utf-8')
      metadata = JSON.parse(raw || '{}')
    } catch (e) {
      metadata = {}
    }

    // attach metadata to file list
    const filesWithMeta = files.map((f) => ({
      ...f,
      status: metadata[f.name]?.status || 'pending',
      reviewedBy: metadata[f.name]?.reviewedBy || null,
      reviewedAt: metadata[f.name]?.reviewedAt || null,
    }))

    // Debug log to help diagnose frontend rendering issues
    try {
      console.log('GET /api/uploads/list ->', JSON.stringify(filesWithMeta, null, 2))
    } catch (e) {
      // ignore logging errors
    }

    return NextResponse.json({ files: filesWithMeta })
  } catch (err: any) {
    console.error('Error listing uploads:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
