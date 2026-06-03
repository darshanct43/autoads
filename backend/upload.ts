import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { s3Service } from '../src/services/s3Service';

const execPromise = util.promisify(exec);

export default async function handler(req: any, res: any) {
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
          
          try {
            console.log(`[UPLOAD] Starting FFMPEG conversion for ${filename}...`);
            const tmpInput = path.join('/tmp', `input-${filename}`);
            const tmpOutput = path.join('/tmp', `output-${filename}`);
            
            fs.writeFileSync(tmpInput, fileBuffer);
            
            await execPromise(`ffmpeg -i "${tmpInput}" -c:v libx264 -c:a aac -movflags +faststart -preset fast "${tmpOutput}"`);
            
            const stat = fs.statSync(tmpOutput);
            if (stat.size < 1024 * 1024) throw new Error(`Output file size too small: ${stat.size} bytes`);

            fileBuffer = fs.readFileSync(tmpOutput);
            
            try { fs.unlinkSync(tmpInput); fs.unlinkSync(tmpOutput); } catch (e) {}
          } catch (ffmpegErr: any) {
            console.error("[UPLOAD] ffmpeg failed", ffmpegErr.message);
            res.status(400).json({ error: 'Video conversion failed.' });
            return resolve();
          }
        } else {
          filename = filename + path.extname(originalName);
        }

        // Upload to S3 using s3Service
        console.log("UPLOAD_TO_S3_START");
        
        console.log("DEBUG_ENV", {
          AWS_BUCKET_NAME: !!process.env.AWS_BUCKET_NAME,
          AWS_REGION: !!process.env.AWS_REGION,
          AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY
        });

        const fileUrl = await s3Service.uploadFile(filename, fileBuffer, mimetype);

        console.log("UPLOAD_TO_S3_SUCCESS");
        console.log(`[UPLOAD_SUCCESS_S3] File uploaded: ${filename} -> Url: ${fileUrl}`);

        res.status(200).json({ url: fileUrl });
        console.log("UPLOAD_RESPONSE_SENT");
        resolve();
      } catch (writeErr: any) {
        console.error("UPLOAD_TO_S3_ERROR", writeErr);
        console.error("UPLOAD_TO_S3_ERROR_RAW", writeErr);
        console.error("UPLOAD_TO_S3_ERROR_JSON", JSON.stringify(writeErr, null, 2));

        res.status(500).json({ error: 'Failed to write uploaded file to S3.' });
        resolve();
      }
    });
  });
}
