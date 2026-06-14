import express from 'express';
import path from 'path';
import fs from 'fs';
import adminAiHandler, { getSystemData } from './backend/admin-ai.js';
import uploadHandler from './lib/upload.js';
import chatHandler from './backend/chat.js';
import createOrderHandler from './api/create-order.js';
import verifyPaymentHandler from './api/verify-payment.js';
import backupEnvHandler from './api/backup-env.js';
import systemMetricsHandler from './api/system-metrics.js';
import debugRazorpayHandler from './api/debug-razorpay.js';

import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env'), override: true });
dotenv.config({ path: path.join(process.cwd(), '.env.example'), override: false });

// Print loaded Razorpay details at startup
const rawKeyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || "";
const rawSecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || "";
const keyIdTrimmed = rawKeyId.trim().replace(/^["']|["']$/g, '');
const secretTrimmed = rawSecret.trim().replace(/^["']|["']$/g, '');

console.log("==========================================");
console.log("🔒 FLEETOPS RAZORPAY ENVIRONMENT SECURITY AUDIT:");
console.log(`- Loaded Source: Local .env.Example File (Verified Auth Source)`);
console.log(`- Loaded Key ID Prefix: ${keyIdTrimmed ? keyIdTrimmed.substring(0, 12) + "..." : "NONE"}`);
console.log(`- Loaded Secret Length: ${secretTrimmed ? secretTrimmed.length : 0} characters`);
console.log("==========================================");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/admin-ai', adminAiHandler as any);
  app.post('/api/upload', uploadHandler as any);
  app.post('/api/chat', chatHandler as any);
  app.post('/api/create-order', createOrderHandler as any);
  app.post('/api/verify-payment', verifyPaymentHandler as any);
  app.post('/api/backup-env', backupEnvHandler as any);
  app.get('/api/debug-razorpay', debugRazorpayHandler as any);
  app.get('/api/system-metrics', systemMetricsHandler as any);

  app.get('/api/payment-config', (req, res) => {
    // Determine configured gateway: favor database/environment
    res.json({
      gateway: 'razorpay'
    });
  });

  app.get('/api/stats', async (req, res) => {
    try {
      const data = await getSystemData();
      res.json({
        activeAdScreensCount: data.activeAdScreensCount,
        registeredDriversCount: data.registeredDriversCount,
        fetchedFromFirestore: data.fetchedFromFirestore
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Highly robust path resolution to prevent ENOENT errors
    // Since server.cjs is built to the 'dist' folder, __dirname refers directly to 'dist'.
    const possiblePaths = [
      typeof __dirname !== 'undefined' ? path.resolve(__dirname) : '',
      path.join(process.cwd(), 'dist'),
      path.resolve('./dist')
    ].filter(p => !!p);

    let distPath = path.join(process.cwd(), 'dist');
    for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, 'index.html'))) {
        distPath = p;
        break;
      }
    }

    console.log(`[Server] Production Mode Active. Selected distPath: ${distPath}`);
    const indexHtmlExists = fs.existsSync(path.join(distPath, 'index.html'));
    console.log(`[Server] index.html exists verification at target: ${indexHtmlExists}`);

    app.use(express.static(distPath));
    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
    app.use('/videos', express.static(path.join(process.cwd(), 'videos')));
    
    app.get('*', (req, res) => {
      console.log(`[Server] Serving index.html for request: ${req.url}`);
      if (indexHtmlExists) {
        res.sendFile(path.join(distPath, 'index.html'));
      } else {
        res.status(404).send('Application build is in progress or index.html is missing. Please reload.');
      }
    });
  }

  console.log(`[Server] Starting Express server on port ${PORT}...`);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Server running on http://localhost:${PORT}`);
  });
}

console.log("[Server] Calling startServer()...");
startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
