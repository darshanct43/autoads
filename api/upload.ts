import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { s3Service } from '../src/services/s3Service';
import { dbAdm, admin } from '../lib/firebase-admin.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function trackAwsAction(success: boolean) {
  try {
    const docRef = dbAdm.collection('systemMetrics').doc('live');
    const updateData: any = {};
    if (success) {
      updateData.awsUploadCount = admin.firestore.FieldValue.increment(1);
    } else {
      updateData.awsFailedUploads = admin.firestore.FieldValue.increment(1);
    }
    // Track write operation too
    updateData.firestoreWrites = admin.firestore.FieldValue.increment(1);
    await docRef.set(updateData, { merge: true });
  } catch (err: any) {
    if (err.message?.includes('PERMISSION_DENIED')) {
      console.info("[Telemetry Info] AWS action tracking skipped (permission denied).");
    } else {
      console.warn("[Telemetry Sync Warning] Failed to track AWS upload:", err.message);
    }
  }
}

export default async function handler(req: any, res: any) {
  console.log("Vercel upload route entered", { method: req.method, url: req.url });
  
  // Ensure we always have a JSON content type if we send JSON
  const sendJson = (status: number, body: any) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(status).json(body);
    }
  };

  try {
    if (req.method !== 'POST') {
      return sendJson(405, { error: 'Method not allowed' });
    }

    const form = formidable({
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024,
    });

    return new Promise<void>((resolve) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('[UPLOAD_ERROR] formidable parse error:', err);
          sendJson(500, { error: 'Error parsing the upload.', details: err.message });
          return resolve();
        }

        const fileField = files.file;
        if (!fileField) {
          console.warn('[UPLOAD_WARN] No file field found in request');
          sendJson(400, { error: 'No file uploaded under key "file"' });
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
          await trackAwsAction(true);

          const successResponse = { url: fileUrl };
          console.log("RESPONSE_SENT", { status: 200, body: successResponse });
          sendJson(200, successResponse);
          resolve();
        } catch (writeErr: any) {
          console.error("S3_UPLOAD_ERROR failure:", writeErr);
          await trackAwsAction(false);

          const errorResponse = { error: 'Failed to write uploaded file to S3.', details: writeErr.message };
          console.log("RESPONSE_SENT", { status: 500, body: errorResponse });
          sendJson(500, errorResponse);
          resolve();
        }
      });
    });
  } catch (err: any) {
    console.error("[UPLOAD_GLOBAL_ERROR]", err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
}
