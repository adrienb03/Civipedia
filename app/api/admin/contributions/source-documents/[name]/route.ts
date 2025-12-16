import fs from 'fs'
import path from 'path'
import { NextResponse, NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionFromCookieStore } from '@/lib/server/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

async function isAdminFromCookieStore(cookieStore: any) {
  try {
    const userId = await getSessionFromCookieStore(cookieStore)
    if (!userId) return false
    const rows = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
    if (!rows || rows.length === 0) return false
    const userEmail = rows[0].email
    const allowedAdmins = ['admin@gmail.com', 'admin2@gmail.com']
    return allowedAdmins.includes(userEmail)
  } catch (e) {
    return false
  }
}

export async function GET(request: NextRequest, { params }: { params: { name?: string } }) {
  try {
    const cookieStore = await cookies()
    if (!(await isAdminFromCookieStore(cookieStore))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Support normal params but also fallback to parsing the pathname
    let name = params?.name || ''
    if (!name) {
      try {
        const url = new URL(request.url)
        const segments = url.pathname.split('/').filter(Boolean)
        // last segment should be the name
        name = segments[segments.length - 1] || ''
        try { name = decodeURIComponent(name) } catch (e) { /* ignore */ }
      } catch (e) {
        // ignore
      }
    }

    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

    const safeName = path.basename(name)
    const docsDir = path.join(process.cwd(), 'Documents')
    const filePath = path.join(docsDir, safeName)

    try {
      await fs.promises.access(filePath, fs.constants.R_OK)
    } catch (e) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const buffer = await fs.promises.readFile(filePath)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}"`,
      },
    })
  } catch (err: any) {
    console.error('Error serving document:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
