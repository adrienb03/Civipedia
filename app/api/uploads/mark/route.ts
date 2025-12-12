import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
import { getSessionFromCookieStore } from '@/lib/server/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

type MetadataEntry = { status?: string; reviewedBy?: string | null; reviewedAt?: number | null }

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const userId = await getSessionFromCookieStore(cookieStore)
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const userData = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    if (!userData || userData.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 401 })

    const user = userData[0]
    const allowedAdmins = ['admin@gmail.com', 'admin2@gmail.com']
    if (!allowedAdmins.includes(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { name, status } = body || {}
    if (!name || !status) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    if (!['accepted', 'refused'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

    const uploadsDir = path.join(process.cwd(), 'uploads')
    const safeName = path.basename(name)
    const filePath = path.join(uploadsDir, safeName)
    try {
      await fs.promises.access(filePath, fs.constants.R_OK)
    } catch (e) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const metaPath = path.join(uploadsDir, 'metadata.json')
    let metadata: Record<string, MetadataEntry> = {}
    try {
      const raw = await fs.promises.readFile(metaPath, 'utf-8')
      metadata = JSON.parse(raw || '{}')
    } catch (e) {
      metadata = {}
    }

    // Merge with existing metadata to preserve uploaderEmail, originalName, uploadedAt, etc.
    metadata[safeName] = {
      ...(metadata[safeName] || {}),
      status,
      reviewedBy: user.email,
      reviewedAt: Date.now(),
    }

    try {
      await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8')
    } catch (e: any) {
      console.error('Could not write metadata', e)
      return NextResponse.json({ error: 'Could not update metadata' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, entry: metadata[safeName] })
  } catch (err: any) {
    console.error('Error marking upload:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
