import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Import handlers (using dynamic imports or manual registration)
// For simplicity and since paths are known, we'll manually register them
// or use a dynamic router.

import healthHandler from '../backend/health';
import chatHandler from '../backend/chat';
import createOrderHandler from '../backend/create-order';
import verifyPaymentHandler from '../backend/verify-payment';
import paymentStatusHandler from '../backend/payment-status';
import uploadHandler from '../backend/upload';
import otpSendHandler from '../backend/otp/send';
import otpVerifyHandler from '../backend/otp/verify';
import demoSetupHandler from '../backend/demo/setup';
import activateCampaignHandler from '../backend/debug/activate-campaign';

async function startServer() {
  const app = express();
  const PORT = process.env.NODE_ENV === 'production' ? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000) : 3001;

  console.log('[SERVER] Starting with Environment Keys:', Object.keys(process.env).filter(k => k.includes('FIREBASE') || k.includes('RAZORPAY') || k.includes('AWS')));
  app.use(express.json());

  // Serve uploads directory publicly with multi-tier fallbacks (memory + tmp + public)
  app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    console.log(`[SERVER] Static request for uploaded file: "${filename}"`);
    
    // 1. Check memory cache (100% reliable fallback)
    const memoryFiles = (global as any).uploadedFiles;
    if (memoryFiles && memoryFiles.has(filename)) {
      const fileData = memoryFiles.get(filename);
      console.log(`[SERVER] Serving "${filename}" from global memory cache`);
      res.setHeader('Content-Type', fileData.mimetype);
      return res.send(fileData.buffer);
    }

    // 2. Check /tmp/uploads directory
    const tmpPath = path.join('/tmp', 'uploads', filename);
    if (fs.existsSync(tmpPath)) {
      console.log(`[SERVER] Serving "${filename}" from /tmp/uploads`);
      const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      res.setHeader('Content-Type', mimeType);
      return res.sendFile(tmpPath);
    }

    // 3. Check public/uploads directory
    const publicPath = path.join(process.cwd(), 'public', 'uploads', filename);
    if (fs.existsSync(publicPath)) {
      console.log(`[SERVER] Serving "${filename}" from public/uploads`);
      const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      res.setHeader('Content-Type', mimeType);
      return res.sendFile(publicPath);
    }

    // 4. Check dist/uploads directory
    const distPath = path.join(process.cwd(), 'dist', 'uploads', filename);
    if (fs.existsSync(distPath)) {
      console.log(`[SERVER] Serving "${filename}" from dist/uploads`);
      const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      res.setHeader('Content-Type', mimeType);
      return res.sendFile(distPath);
    }

    console.warn(`[SERVER] Uploaded file not found: "${filename}"`);
    res.status(404).send('Not found');
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
    const apiPath = req.path.replace(/^\//, '');
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
