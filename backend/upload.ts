import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!(global as any).uploadedFiles) {
    (global as any).uploadedFiles = new Map();
  }

  const form = formidable({
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024,
  });

  return new Promise<void>((resolve) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('[UPLOAD_ERROR]', err);
        res.status(500).json({ error: 'Error parsing the upload.' });
        return resolve();
      }

      const fileField = files.file;
      if (!fileField) {
        res.status(400).json({ error: 'No file uploaded under key "file"' });
        return resolve();
      }

      const file = Array.isArray(fileField) ? fileField[0] : fileField;

      try {
        const fileBuffer = fs.readFileSync(file.filepath);
        const filename = `${Date.now()}-${path.basename(file.originalFilename || 'upload.bin')}`;

        (global as any).uploadedFiles.set(filename, {
          mimetype: file.mimetype || 'application/octet-stream',
          buffer: fileBuffer,
        });

        const tmpDir = path.join('/tmp', 'uploads');
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        fs.writeFileSync(path.join(tmpDir, filename), fileBuffer);

        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers.host || 'localhost:3000';
        const fileUrl = `${protocol}://${host}/uploads/${filename}`;

        console.log(`[UPLOAD_SUCCESS] File uploaded: ${filename} -> Url: ${fileUrl}`);

        res.status(200).json({ url: fileUrl });
        resolve();
      } catch (writeErr: any) {
        console.error('[UPLOAD_WRITE_ERROR]', writeErr);
        res.status(500).json({ error: 'Failed to write uploaded file.' });
        resolve();
      }
    });
  });
}
