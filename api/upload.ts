import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'fs';
import { uploadToS3 } from '../src/services/awsService.ts';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({});
  
  try {
    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = `${Date.now()}-${file.originalFilename || 'upload'}`;
    const url = await uploadToS3(fileBuffer, fileName, file.mimetype || 'application/octet-stream');

    res.status(200).json({ url });
  } catch (error: any) {
    console.error('[SERVERLESS] Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
}
