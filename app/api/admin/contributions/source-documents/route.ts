import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'
import { getSessionFromCookieStore } from '@/lib/server/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

function isRealPDF(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString('utf8') === '%PDF-'
}

async function ensureDocumentsDir(dir: string) {
  try {
    await fs.promises.access(dir)
  } catch {
    await fs.promises.mkdir(dir, { recursive: true })
  }
}

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

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies()
    if (!(await isAdminFromCookieStore(cookieStore))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const docsDir = path.join(process.cwd(), 'Documents')
    await ensureDocumentsDir(docsDir)

    const names = await fs.promises.readdir(docsDir)
    const files: Array<any> = []
    for (const name of names) {
      try {
        const filePath = path.join(docsDir, name)
        const st = await fs.promises.stat(filePath)
        if (st.isFile()) {
          files.push({ name, size: st.size, mtime: st.mtime.getTime() })
        }
      } catch (e) {
        // ignore individual file errors
      }
    }

    return NextResponse.json({ files })
  } catch (err: any) {
    console.error('Error listing Documents:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    if (!(await isAdminFromCookieStore(cookieStore))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content-type' }, { status: 400 })
    }

    const formData = await req.formData()
    // Accept multiple files under field name 'file' (repeated) or a single one
    const rawFiles = formData.getAll('file') as any[]
    if (!rawFiles || rawFiles.length === 0) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const docsDir = path.join(process.cwd(), 'Documents')
    await ensureDocumentsDir(docsDir)

    const saved: Array<any> = []

    for (const file of rawFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        if (buffer.length > MAX_SIZE) {
          // skip this file and record error
          saved.push({ originalName: file.name || 'document.pdf', error: 'File too large' })
          continue
        }

        if (!isRealPDF(buffer)) {
          saved.push({ originalName: file.name || 'document.pdf', error: 'Not a PDF' })
          continue
        }

        const originalName = file.name || 'document.pdf'
        const safeName = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.\\-_]/g, '_')}`
        const dest = path.join(docsDir, safeName)
        await fs.promises.writeFile(dest, buffer)

        saved.push({ originalName, safeName, path: `/Documents/${safeName}` })
      } catch (e: any) {
        saved.push({ originalName: file?.name || 'document.pdf', error: e?.message || 'Save failed' })
      }
    }

    return NextResponse.json({ saved })
  } catch (err: any) {
    console.error('Upload error (Documents):', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
