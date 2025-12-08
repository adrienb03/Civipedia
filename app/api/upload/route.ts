import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

async function ensureUploadsDir(dir: string) {
  try {
    await fs.promises.access(dir);
  } catch (e) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

async function maybeUploadToGoogleDrive(filePath: string, filename: string) {
  // Optional Google Drive upload. Requires setting environment variables:
  // - GOOGLE_DRIVE_UPLOAD=true
  // - GOOGLE_SERVICE_ACCOUNT_JSON (JSON string of a service account key)
  // - GOOGLE_DRIVE_FOLDER_ID (optional target folder id)
  if (process.env.GOOGLE_DRIVE_UPLOAD !== 'true') return { uploaded: false };

  try {
    // lazy require to avoid hard dependency unless enabled
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { google } = require('googleapis');

    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!keyJson) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON');

    const key = JSON.parse(keyJson);

    const auth = new google.auth.JWT(
      key.client_email,
      undefined,
      key.private_key,
      ['https://www.googleapis.com/auth/drive.file']
    );

    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata: any = { name: filename };
    if (process.env.GOOGLE_DRIVE_FOLDER_ID) fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];

    const media = {
      mimeType: 'application/pdf',
      body: fs.createReadStream(filePath),
    };

    const res = await drive.files.create({ requestBody: fileMetadata, media, fields: 'id, name' });
    return { uploaded: true, id: res.data.id, name: res.data.name };
  } catch (err) {
    console.warn('Google Drive upload failed:', err?.message || err);
    return { uploaded: false, error: String(err) };
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files');

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: 'No files' }), { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    await ensureUploadsDir(uploadsDir);

    const saved: Array<{ name: string; path: string; drive?: any }> = [];

    for (const f of files) {
      // `f` is a File object from the Web API
      // Type of f may not be strongly typed in Node runtime
      // @ts-ignore
      const file: any = f;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const safeName = `${Date.now()}-${(file.name || 'upload').replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const dest = path.join(uploadsDir, safeName);
      await fs.promises.writeFile(dest, buffer);

      const driveResult = await maybeUploadToGoogleDrive(dest, file.name || safeName);

      saved.push({ name: file.name || safeName, path: `/uploads/${safeName}`, drive: driveResult });
    }

    return new Response(JSON.stringify({ saved }), { status: 200 });
  } catch (err: any) {
    console.error('Upload error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Upload failed' }), { status: 500 });
  }
}
