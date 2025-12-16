import fs from 'fs'
import path from 'path'
import { NextResponse, NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, context: { params?: any }) {
  try {
    // Support normal params but also fallback to parsing the pathname
    const paramsObj = await (context.params ?? {})
    let name = paramsObj?.name || ''
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

    let resolvedPath = filePath
    try {
      await fs.promises.access(resolvedPath, fs.constants.R_OK)
    } catch (e) {
      // Try tolerant fallbacks: strip common date suffixes or find a matching file
      const candidates: string[] = []
      // Always try the requested safeName first
      candidates.push(safeName)
      // If name contains ' - ' (common separator), try first part
      if (safeName.includes(' - ')) {
        candidates.push(safeName.split(' - ')[0].trim())
      }
      // If name ends with a date like YYYY-MM-DD, strip it
      const dateSuffixMatch = safeName.match(/(.+?)\s*-\s*(\d{4}-\d{2}-\d{2})$/)
      if (dateSuffixMatch) {
        candidates.push(dateSuffixMatch[1].trim())
      }
      // Also try removing any trailing tokens after a space
      if (safeName.includes(' ')) {
        candidates.push(safeName.split(' ')[0].trim())
      }

      // Try variant without extension
      if (safeName.includes('.')) {
        const noExt = safeName.slice(0, safeName.lastIndexOf('.'))
        candidates.push(noExt)
      }

      // Add decoded variant
      try {
        const dec = decodeURIComponent(name)
        if (dec && dec !== safeName) candidates.push(dec)
      } catch (_e) {}

      // Normalize candidates to unique
      const uniq = Array.from(new Set(candidates.filter(Boolean)))

      let found: string | null = null
      try {
        const files = await fs.promises.readdir(docsDir)
        for (const c of uniq) {
          // direct match
          if (files.includes(c)) { found = c; break }
          // with extension match (if candidate has no extension)
          const matchStarts = files.find(f => f.startsWith(c))
          if (matchStarts) { found = matchStarts; break }
          // contains
          const matchContains = files.find(f => f.includes(c))
          if (matchContains) { found = matchContains; break }
        }
      } catch (_e) {
        // readdir may fail; ignore
      }

      if (found) {
        resolvedPath = path.join(docsDir, found)
      } else {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
    }

    const usePath = resolvedPath
    const buffer = await fs.promises.readFile(usePath)
    // Attempt to set content type based on extension (default to application/pdf)
    const realName = path.basename(usePath)
    const ext = path.extname(realName).toLowerCase()
    const contentType = ext === '.pdf' ? 'application/pdf' : 'application/octet-stream'

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${realName}"`,
      },
    })
  } catch (err: any) {
    console.error('Error serving document:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
