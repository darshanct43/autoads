import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Import handlers (using dynamic imports or manual registration)
// For simplicity and since paths are known, we'll manually register them
// or use a dynamic router.

import healthHandler from './backend/health';
import chatHandler from './backend/chat';
import createOrderHandler from './api/create-order';
import verifyPaymentHandler from './api/verify-payment';
import paymentStatusHandler from './backend/payment-status';
import uploadHandler from './backend/upload';
import otpSendHandler from './backend/otp/send';
import otpVerifyHandler from './backend/otp/verify';
import demoSetupHandler from './backend/demo/setup';
import activateCampaignHandler from './backend/debug/activate-campaign';
import adminAiHandler from './backend/admin-ai';


async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log('[SERVER] Starting with Environment Keys:', Object.keys(process.env).filter(k => k.includes('FIREBASE') || k.includes('RAZORPAY') || k.includes('AWS')));
  app.use(express.json());

  // Serve videos directory publicly
  const isProd = process.env.NODE_ENV === 'production';
  const localVideosDir = path.resolve(process.cwd(), isProd ? 'dist/videos' : 'public/videos');
  
  app.use('/videos/:filename', (req, res, next) => {
    const filename = req.params.filename;
    const fullPath = path.join(localVideosDir, filename);
    let fileSize = 0;
    let exists = false;
    try {
      exists = fs.existsSync(fullPath);
      if (exists) {
        fileSize = fs.statSync(fullPath).size;
      }
    } catch (e) {}

    console.log('--- [VIDEO ROUTING DEBUG] ---');
    console.log('VIDEO REQUEST URL:', req.originalUrl || req.url);
    console.log('RESOLVED FILE PATH:', fullPath);
    console.log('FILE EXISTS:', exists);
    console.log('FILE SIZE (bytes):', fileSize);
    console.log('-----------------------------');
    next();
  });

  app.use('/videos', express.static(localVideosDir, {
    setHeaders: (res, path) => {
      if (path.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      }
    }
  }));

  // Serve uploads directory publicly with multi-tier fallbacks (memory + tmp + public)
  app.get('/uploads/:filename', (req, res) => {
    res.setHeader('X-UPLOADS-ROUTE', 'HIT');
    const filename = req.params.filename;
    
    if (filename === 'qr_showcase.mp4') {
      try {
        fs.writeFileSync(path.resolve(process.cwd(), 'server_debug.log'), '');
      } catch (err) {}
    }

    const logAndConsole = (msg: string) => {
      console.log(msg);
      try {
        fs.appendFileSync(path.resolve(process.cwd(), 'server_debug.log'), msg + '\n');
      } catch (err) {}
    };

    logAndConsole(`[UPLOADS ROUTE HIT] ${req.path}`);
    logAndConsole(`[SERVER] Static request for uploaded file: "${filename}"`);
    
    // 1. Check memory cache (100% reliable fallback)
    const memoryFiles = (global as any).uploadedFiles;
    if (memoryFiles && memoryFiles.has(filename)) {
      const fileData = memoryFiles.get(filename);
      logAndConsole(`[SERVER] Serving "${filename}" from global memory cache`);
      logAndConsole(`[LOCAL FILE FOUND] global_memory_cache`);
      logAndConsole(`[RETURNING VIDEO] ${filename}`);
      res.setHeader('Content-Type', fileData.mimetype);
      return res.send(fileData.buffer);
    }

    // 2. Check /tmp/uploads directory
    const tmpPath = path.join('/tmp', 'uploads', filename);
    if (fs.existsSync(tmpPath)) {
      logAndConsole(`[SERVER] Serving "${filename}" from /tmp/uploads`);
      logAndConsole(`[LOCAL FILE FOUND] ${tmpPath}`);
      logAndConsole(`[RETURNING VIDEO] ${filename}`);
      const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : filename.endsWith('.mp4') ? 'video/mp4' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      res.setHeader('Content-Type', mimeType);
      return res.sendFile(tmpPath);
    }

    // 3. Check public/uploads directory
    const publicPath = path.join(process.cwd(), 'public', 'uploads', filename);
    if (fs.existsSync(publicPath)) {
      logAndConsole(`[SERVER] Serving "${filename}" from public/uploads`);
      logAndConsole(`[LOCAL FILE FOUND] ${publicPath}`);
      logAndConsole(`[RETURNING VIDEO] ${filename}`);
      const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : filename.endsWith('.mp4') ? 'video/mp4' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      res.setHeader('Content-Type', mimeType);
      return res.sendFile(publicPath);
    }

    // 4. Check dist/uploads directory
    const distPath = path.join(process.cwd(), 'dist', 'uploads', filename);
    if (fs.existsSync(distPath)) {
      logAndConsole(`[SERVER] Serving "${filename}" from dist/uploads`);
      logAndConsole(`[LOCAL FILE FOUND] ${distPath}`);
      logAndConsole(`[RETURNING VIDEO] ${filename}`);
      const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : filename.endsWith('.mp4') ? 'video/mp4' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      res.setHeader('Content-Type', mimeType);
      return res.sendFile(distPath);
    }

    // 5. Try fetching from AWS S3 Bucket directly (Bypasses CloudFront)
    const bucketName = process.env.AWS_S3_BUCKET_NAME || 'darshan-autoads-storage';
    const region = process.env.AWS_REGION || 'us-east-2';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      logAndConsole(`[SERVER] S3 bucket fallback triggered for: "${filename}"`);
      const s3ClientForRoute = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const possibleKeys = [
        `campaigns/showcase/video/${filename}`,
        `uploads/${filename}`,
        filename
      ];

      (async () => {
        let streamBody: any = null;
        let contentType = filename.endsWith('.mp4') ? 'video/mp4' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
        let foundKey = "";

        for (const key of possibleKeys) {
          try {
            const command = new GetObjectCommand({
              Bucket: bucketName,
              Key: key,
            });
            const responseInfo = await s3ClientForRoute.send(command);
            if (responseInfo.Body) {
              streamBody = responseInfo.Body;
              if (responseInfo.ContentType) {
                contentType = responseInfo.ContentType;
              }
              foundKey = key;
              break;
            }
          } catch (err) {
            // Keep trying other keys
          }
        }

        if (streamBody) {
          logAndConsole(`[SERVER] Serving "${filename}" from S3 bucket: ${bucketName}/${foundKey}`);
          logAndConsole(`[S3 OBJECT FOUND] ${foundKey}`);
          logAndConsole(`[RETURNING VIDEO] ${filename}`);
          res.setHeader('Content-Type', contentType);

          try {
            const chunks: any[] = [];
            for await (const chunk of streamBody) {
              chunks.push(chunk);
            }
            const completeBuffer = Buffer.concat(chunks);

            // Put in memory cache
            if (!(global as any).uploadedFiles) {
              (global as any).uploadedFiles = new Map();
            }
            (global as any).uploadedFiles.set(filename, {
              mimetype: contentType,
              buffer: completeBuffer,
            });

            // Write to /tmp/uploads
            const tmpDir = path.join('/tmp', 'uploads');
            if (!fs.existsSync(tmpDir)) {
              fs.mkdirSync(tmpDir, { recursive: true });
            }
            fs.writeFileSync(path.join(tmpDir, filename), completeBuffer);

            return res.send(completeBuffer);
          } catch (streamErr) {
            logAndConsole(`[SERVER] Error buffering S3 file stream: ${streamErr instanceof Error ? streamErr.message : streamErr}`);
            streamBody.pipe(res);
          }
          return;
        } else {
          logAndConsole(`[SERVER] Uploaded file not found anywhere in local system or S3 bucket caches: "${filename}"`);
          res.status(404).send('Not found');
        }
      })().catch(err => {
        logAndConsole(`[SERVER] Unhandled error during S3 download routing: ${err instanceof Error ? err.message : err}`);
        res.status(500).send('Storage connection error');
      });
    } else {
      logAndConsole(`[SERVER] Uploaded file not found locally, and AWS credentials are not configured to fallback to S3: "${filename}"`);
      res.status(404).send('Not found');
    }
  });

  // Serve uploads directory publicly
  const localUploadsDir = path.resolve(process.cwd(), 'public/uploads');
  if (!fs.existsSync(localUploadsDir)) {
    fs.mkdirSync(localUploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(localUploadsDir));

  // API Routes - Bridge to Vercel functions
  app.use('/api', async (req, res) => {
    // Ensure the response header is set to JSON by default
    res.setHeader("Content-Type", "application/json");

    // Get apiPath directly from req.path to avoid Express version/wildcard differences
    const apiPath = req.path.replace(/^\//, '').replace(/\/+$/, '').replace(/\.+$/, '');
    console.log(`[SERVER] API Request: ${req.method} /api${req.path} -> apiPath: "${apiPath}"`);
    
    try {
      let handler;
      if (apiPath === 'health') handler = healthHandler;
      else if (apiPath === 'chat') handler = chatHandler;
      else if (apiPath === 'create-order') handler = createOrderHandler;
      else if (apiPath === 'verify-payment') handler = verifyPaymentHandler;
      else if (apiPath === 'payment-status') handler = paymentStatusHandler;
      else if (apiPath === 'upload') handler = uploadHandler;
      else if (apiPath === 'otp/send') handler = otpSendHandler;
      else if (apiPath === 'otp/verify') handler = otpVerifyHandler;
      else if (apiPath === 'demo/setup') handler = demoSetupHandler;
      else if (apiPath === 'debug/activate-campaign') handler = activateCampaignHandler;
      else if (apiPath === 'admin-ai') handler = adminAiHandler;


      if (handler) {
        await handler(req, res);
      } else {
        console.warn(`[SERVER] API route not found: "/api/${apiPath}"`);
        res.status(404).json({ error: `API route /api/${apiPath} not found` });
      }
    } catch (error: any) {
      console.error(`[SERVER] Error handling /api/${apiPath}:`, error);
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  });

  // Vite / Static Assets
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      if (req.path.endsWith('showcase.mp4') || req.path.includes('/uploads/')) {
        console.log('[FALLING TO INDEX.HTML]');
        try {
          fs.appendFileSync(path.resolve(process.cwd(), 'server_debug.log'), '[FALLING TO INDEX.HTML]\n');
        } catch (err) {}
      }
      next();
    });

    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      console.log('[FALLING TO INDEX.HTML]');
      try {
        fs.appendFileSync(path.resolve(process.cwd(), 'server_debug.log'), '[FALLING TO INDEX.HTML]\n');
      } catch (err) {}
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
