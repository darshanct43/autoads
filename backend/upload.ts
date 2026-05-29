import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

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
            
            // Convert to H264 + AAC MP4
            await execPromise(`ffmpeg -i "${tmpInput}" -c:v libx264 -c:a aac -movflags +faststart -preset fast "${tmpOutput}"`);
            
            // VALIDATION
            const stat = fs.statSync(tmpOutput);
            if (stat.size < 1024 * 1024) { // Less than 1MB
              throw new Error(`Output file size too small: ${stat.size} bytes`);
            }

            const { stdout: ffprobeOut } = await execPromise(`ffprobe -v error -show_format -show_streams -of json "${tmpOutput}"`);
            const metadata = JSON.parse(ffprobeOut);

            const hasVideo = metadata.streams?.some((s: any) => s.codec_type === 'video');
            const hasAudio = metadata.streams?.some((s: any) => s.codec_type === 'audio');
            const duration = parseFloat(metadata.format?.duration || "0");
            const formatName = metadata.format?.format_name || "";

            console.log("ffprobe output:", ffprobeOut);
            console.log("final output path:", tmpOutput);
            console.log("final file size:", stat.size);
            console.log("final duration:", duration);
            
            const validationResult = {
               hasVideo, 
               hasAudio, 
               validDuration: duration > 0,
               isMp4: formatName.includes('mp4') || formatName.includes('mov')
            };
            console.log("validation result:", validationResult);

            if (!hasVideo || duration <= 0 || !validationResult.isMp4) {
                throw new Error("Invalid output MP4: missing video stream, zero duration, or missing moov atom");
            }

            fileBuffer = fs.readFileSync(tmpOutput);
            console.log(`[UPLOAD] FFMPEG conversion successful: ${filename}`);
            
            try { fs.unlinkSync(tmpInput); fs.unlinkSync(tmpOutput); } catch (e) {}
          } catch (ffmpegErr: any) {
            console.error("[UPLOAD] ffmpeg conversion/validation failed, rejecting upload", ffmpegErr.message);
            res.status(400).json({ error: 'Video conversion failed. Unsupported codec, corrupted file, or missing streams.' });
            return resolve();
          }
        } else {
          filename = filename + path.extname(originalName);
        }

        (global as any).uploadedFiles.set(filename, {
          mimetype,
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
