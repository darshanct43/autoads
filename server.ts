import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import adminAiHandler, { getSystemData } from './backend/admin-ai.js';
import uploadHandler from './backend/upload.js';
import chatHandler from './backend/chat.js';
import createOrderHandler from './api/create-order.js';
import verifyPaymentHandler from './api/verify-payment.js';

dotenv.config();

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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
