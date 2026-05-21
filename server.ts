import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Import handlers (using dynamic imports or manual registration)
// For simplicity and since paths are known, we'll manually register them
// or use a dynamic router.

import healthHandler from './api/health.ts';
import chatHandler from './api/chat.ts';
import createOrderHandler from './api/create-order.ts';
import verifyPaymentHandler from './api/verify-payment.ts';
import paymentStatusHandler from './api/payment-status.ts';
import uploadHandler from './api/upload.ts';
import otpSendHandler from './api/otp/send.ts';
import otpVerifyHandler from './api/otp/verify.ts';
import demoSetupHandler from './api/demo/setup.ts';
import activateCampaignHandler from './api/debug/activate-campaign.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes - Bridge to Vercel functions
  app.all('/api/*all', async (req, res) => {
    // In Express 5, the parameter name matches the pattern if it includes a wildcard
    const apiPath = (req.params as any)['all'] || '';
    
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
        res.status(404).json({ error: `API route /api/${apiPath} not found` });
      }
    } catch (error: any) {
      console.error(`Error handling /api/${apiPath}:`, error);
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
