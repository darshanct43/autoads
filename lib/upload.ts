import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { s3Service } from '../src/services/s3Service';

const execPromise = util.promisify(exec);

export default async function handler(req: any, res: any) {
  console.log("UPLOAD_ROUTE_ENTERED");
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
        console.log("UPLOAD_START");
        console.log("UPLOAD_FILE_RECEIVED", { 
          originalName: file.originalFilename, 
          mimetype: file.mimetype, 
          size: file.size 
        });
        
        let fileBuffer = fs.readFileSync(file.filepath);
        let originalName = file.originalFilename || 'upload.bin';
        let basename = path.basename(originalName, path.extname(originalName));
        let filename = `${Date.now()}-${basename}`;
        let mimetype = file.mimetype || 'application/octet-stream';

        const isVideo = mimetype.startsWith('video/') || originalName.endsWith('.mp4') || originalName.endsWith('.mov');

        if (isVideo) {
          filename = filename + '.mp4';
          mimetype = 'video/mp4';
          console.log(`[UPLOAD] Bypassing FFMPEG conversion for ${filename}...`);
          // Simply pass through the uploaded file without conversion to prevent timeout
          // fileBuffer remains as originally read from temporary upload filePath
        } else {
          filename = filename + path.extname(originalName);
        }

        // S3 parameters log
        console.log("S3_UPLOAD_PARAMS", {
          filename,
          mimetype,
          bucket: process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || 'undefined',
          region: process.env.AWS_REGION || 'undefined'
        });

        // Upload to S3 using s3Service
        console.log("S3_UPLOAD_START");
        const fileUrl = await s3Service.uploadFile(filename, fileBuffer, mimetype);
        console.log("S3_UPLOAD_SUCCESS");

        const successResponse = { url: fileUrl };
        console.log("RESPONSE_SENT", { status: 200, body: successResponse });
        res.status(200).json(successResponse);
        resolve();
      } catch (writeErr: any) {
        console.log("S3_UPLOAD_ERROR");
        console.error("FULL ERROR:", writeErr);

        const errorResponse = { error: 'Failed to write uploaded file to S3.' };
        console.log("RESPONSE_SENT", { status: 500, body: errorResponse });
        res.status(500).json(errorResponse);
        resolve();
      }
    });
  });
}
