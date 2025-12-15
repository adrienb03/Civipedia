import * as fs from 'fs'
import * as path from 'path'
import { cookies } from 'next/headers'
import { getSessionFromCookieStore } from '@/lib/server/auth'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Les imports de pdf-parse ne sont plus nécessaires
// import { execFile } from 'child_process' // Maintenu pour ClamAV
import { execFile } from 'child_process'
import { promisify } from 'util'
const execFileAsync = promisify(execFile)

export const runtime = 'nodejs'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

function isRealPDF(buffer: Buffer): boolean {
    return buffer.subarray(0, 5).toString('utf8') === '%PDF-'
}

async function scanWithClamAV(filePath: string) {
    const { stdout } = await execFileAsync('clamscan', ['--no-summary', filePath])
    if (!stdout.includes('OK')) {
        throw new Error('Virus détecté')
    }
}


async function ensureUploadsDir(dir: string) {
    try {
        await fs.promises.access(dir)
    } catch {
        await fs.promises.mkdir(dir, { recursive: true })
    }
}

async function maybeUploadToGoogleDrive(filePath: string, filename: string) {
    if (process.env.GOOGLE_DRIVE_UPLOAD !== 'true') return { uploaded: false }

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { google } = require('googleapis')

        const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
        if (!keyJson) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON')

        const key = JSON.parse(keyJson)

        const auth = new google.auth.JWT(
            key.client_email,
            undefined,
            key.private_key,
            ['https://www.googleapis.com/auth/drive.file']
        )

        const drive = google.drive({ version: 'v3', auth })

        const fileMetadata: any = { name: filename }
        if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
            fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID]
        }

        const media = {
            mimeType: 'application/pdf',
            body: fs.createReadStream(filePath),
        }

        const res = await drive.files.create({
            requestBody: fileMetadata,
            media,
            fields: 'id, name',
        })

        return { uploaded: true, id: res.data.id, name: res.data.name }
    } catch (err: any) {
        console.warn('Google Drive upload failed:', err?.message || err)
        return { uploaded: false }
    }
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const files = formData.getAll('files')

        if (!files || files.length === 0) {
            return new Response(JSON.stringify({ error: 'No files' }), { status: 400 })
        }

        const uploadsDir = path.join(process.cwd(), 'uploads')
        await ensureUploadsDir(uploadsDir)

        const saved: Array<{ name: string; path: string; drive?: any }> = []

        // uploader
        let uploaderEmail: string | null = null
        try {
            const cookieStore = cookies()
            const userId = await getSessionFromCookieStore(cookieStore)
            if (userId) {
                const userData = await db
                    .select({ email: users.email })
                    .from(users)
                    .where(eq(users.id, userId))
                    .limit(1)
                if (userData.length > 0) uploaderEmail = userData[0].email
            }
        } catch {}

        for (const f of files) {
            // @ts-ignore
            const file: any = f
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            // SÉCURITÉ 1 — taille
            if (buffer.length > MAX_SIZE) {
                return new Response(
                    JSON.stringify({ error: `${file.name} dépasse 10 MB` }),
                    { status: 400 }
                )
            }

            //SÉCURITÉ 2 — signature PDF
            if (!isRealPDF(buffer)) {
                return new Response(
                    JSON.stringify({ error: `${file.name} n’est pas un vrai PDF` }),
                    { status: 400 }
                )
            }



            const safeName = `${Date.now()}-${(file.name || 'upload').replace(/[^a-zA-Z0-9.\-_]/g, '_')}`
            const dest = path.join(uploadsDir, safeName)

            await fs.promises.writeFile(dest, buffer)

            // SÉCURITÉ 4 — antivirus
            try {
                await scanWithClamAV(dest)
            } catch {
                await fs.promises.unlink(dest)
                return new Response(
                    JSON.stringify({ error: `${file.name} contient un virus` }),
                    { status: 400 }
                )
            }

            const driveResult = await maybeUploadToGoogleDrive(dest, file.name || safeName)

            // metadata
            const metaPath = path.join(uploadsDir, 'metadata.json')
            let metadata: Record<string, any> = {}
            try {
                metadata = JSON.parse(await fs.promises.readFile(metaPath, 'utf-8'))
            } catch {}

            metadata[safeName] = {
                originalName: file.name || safeName,
                uploaderEmail,
                uploadedAt: Date.now(),
                status: 'pending',
                reviewedBy: null,
                reviewedAt: null,
            }

            await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2))

            saved.push({ name: file.name || safeName, path: `/uploads/${safeName}`, drive: driveResult })
        }

        return new Response(JSON.stringify({ saved }), { status: 200 })
    } catch (err: any) {
        console.error('Upload error:', err)
        return new Response(JSON.stringify({ error: err?.message || 'Upload failed' }), { status: 500 })
    }
}