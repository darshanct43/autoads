import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import RazorpayConstructor from "razorpay";
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import cors from 'cors';
import multer from 'multer';
import { uploadToS3 } from './src/services/awsService.ts';
import twilio from 'twilio';
import fs from 'fs';
import { GoogleGenAI } from "@google/genai";

// Load Firebase Config for both Client and Server needs
let firebaseConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn("[SERVER] Warning: Could not read firebase-applet-config.json during initialization:", e);
}

// Demo Setup Function
async function createDemoCampaign(db: any) {
    const campaignData = {
        title: "Demo AutoAds Campaign",
        status: "ACTIVE",
        mediaUrl: "https://d3v3y4z5a6b7c8.cloudfront.net/demo-ad-1.mp4",
        mediaType: "VIDEO",
        durationDays: 30,
        hoursPerDay: 8,
        maxAutos: 10,
        createdAt: FieldValue.serverTimestamp(),
    };
    const campaignRef = await db.collection('campaigns').add(campaignData);
    await db.collection('terminals').doc("TRM-DEMO001").set({
        id: "TRM-DEMO001",
        status: "ACTIVE",
        createdAt: FieldValue.serverTimestamp()
    });
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB to support 3min videos
});
const Razorpay = (RazorpayConstructor as any).default || RazorpayConstructor;

// ESM/CJS compatibility for paths
let __filenameResolved = '';
let __dirnameResolved = '';

try {
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    __filenameResolved = fileURLToPath(import.meta.url);
    __dirnameResolved = path.dirname(__filenameResolved);
  } else if (typeof __filename !== 'undefined') {
    __filenameResolved = __filename;
    __dirnameResolved = typeof __dirname !== 'undefined' ? __dirname : path.dirname(__filename);
  }
} catch (e) {
  console.warn("Path resolution fallback active:", e);
  __filenameResolved = process.cwd();
  __dirnameResolved = process.cwd();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  
  // Basic middlewares
  app.use(express.json());
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));

  // Health route - early
  app.get("/health", (req, res) => {
    res.json({
      success: true,
      server: "running",
      time: new Date().toISOString()
    });
  });

  // Force JSON headers for all API routes
  app.use("/api", (req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    next();
  });

  // Firebase Admin Init
  let adminApp;
  const firebaseProjectId = firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT;
  const firebaseDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';

  // Force project ID env vars to avoid SDK defaulting to host project
  if (firebaseProjectId) {
    process.env.GCP_PROJECT = firebaseProjectId;
    process.env.GOOGLE_CLOUD_PROJECT = firebaseProjectId;
  }

  if (!getApps().length) {
    const rawSA = process.env.FIREBASE_SERVICE_ACCOUNT;
    const appOptions: any = {
      projectId: firebaseProjectId
    };

    if (rawSA && rawSA.trim()) {
      try {
        let serviceAccount;
        const trimmedSA = rawSA.trim();
        if (trimmedSA.startsWith('{')) {
          serviceAccount = JSON.parse(trimmedSA);
          if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
          }
          appOptions.credential = cert(serviceAccount);
          console.log("[SERVER] Firebase initializing with Service Account for project:", firebaseProjectId);
        }
      } catch (e) {
        console.error("[SERVER] Failed to parse FIREBASE_SERVICE_ACCOUNT", e);
      }
    }
    
    // If no service account, use ADCs but still force the project ID
    if (!appOptions.credential) {
      console.log("[SERVER] No Service Account found, using Application Default Credentials for project:", firebaseProjectId);
    }
    
    adminApp = initializeApp(appOptions);
    console.log("[SERVER] Firebase initialized for project:", firebaseProjectId);
  } else {
    adminApp = getApps()[0];
  }
  
  // Use the specific named database
  const dbAdm = getFirestore(adminApp, firebaseDatabaseId);
  console.log("[SERVER] Firestore initialized with databaseId:", firebaseDatabaseId);

  // Gemini Setup
  const getGeminiAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[SERVER] GEMINI_API_KEY missing");
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // Razorpay Helper
  const getRazorpay = () => {
    const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      console.error("[SERVER] Razorpay credentials missing:", { hasId: !!key_id, hasSecret: !!key_secret });
      return null;
    }
    return new Razorpay({ key_id, key_secret });
  };

  // Twilio Helper
  const getTwilioClient = () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !verifyServiceSid) {
      console.error("[SERVER] Twilio credentials missing");
      return null;
    }
    return {
      client: twilio(accountSid, authToken),
      serviceSid: verifyServiceSid
    };
  };

  // API Routes (Specific)
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileName = `${Date.now()}-${req.file.originalname}`;
      const url = await uploadToS3(req.file.buffer, fileName, req.file.mimetype);
      
      res.json({ url });
    } catch (error: any) {
      console.error("[SERVER] Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // 1. Send OTP
  app.post("/api/otp/send", async (req, res) => {
    // Migration Note: Logic is now in /api/otp/send.ts for Vercel
    res.json({ success: true, message: "Migrated to serverless" });
  });

  app.post("/api/otp/verify", async (req, res) => {
    res.json({ success: true, message: "Migrated to serverless" });
  });




  // 3. Razorpay Orders
  app.post("/api/create-order", async (req, res) => {
    res.json({ success: true, message: "Migrated to serverless" });
  });

  app.post("/api/verify-payment", async (req, res) => {
    res.json({ success: true, message: "Migrated to serverless" });
  });

  app.get("/api/payment-status", async (req, res) => {
    res.json({ success: true, message: "Migrated to serverless" });
  });

  // API: Razorpay Create Order
  app.post("/api/razorpay/create-order", async (req, res) => {
    const rzp = getRazorpay();
    if (!rzp) return res.status(500).json({ error: "Razorpay not configured" });

    try {
      const { amount } = req.body;
      if (!amount) return res.status(400).json({ error: "Amount required" });

      const order = await rzp.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
      });

      res.json({
        success: true,
        order,
        key: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID
      });
    } catch (error: any) {
      console.error("[RAZORPAY] Create error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API: Razorpay Verify Payment
  app.post("/api/razorpay/verify-payment", async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, campaignData, planData, uid } = req.body;
      const finalCampaignId = req.body.campaignId || (campaignData && (campaignData.campaignId || campaignData.id));

      const secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET;
      if (!secret) return res.status(500).json({ error: "Razorpay Secret missing" });

      const generated_signature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ success: false, error: "Invalid signature" });
      }

      const paymentRecord = {
        transactionId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: planData?.amount || 0,
        status: 'SUCCESS',
        paymentMethod: 'razorpay',
        createdAt: FieldValue.serverTimestamp(),
        verifiedAt: FieldValue.serverTimestamp(),
        customerId: uid || 'UNKNOWN',
        campaignId: finalCampaignId || campaignData?.title || 'PENDING',
        isWebhookTriggered: false
      };
      
      await dbAdm.collection('payments').add(paymentRecord);

      if (finalCampaignId) {
          await dbAdm.collection('campaigns').doc(finalCampaignId).set({
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            paymentReceived: true,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
      } else if (campaignData) {
          await dbAdm.collection('campaigns').add({
            ...campaignData,
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            paymentReceived: true,
            updatedAt: FieldValue.serverTimestamp()
          });
      }

      res.status(200).json({ success: true, status: "SUCCESS" });
    } catch (error: any) {
      console.error("[RAZORPAY] Verify error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API: Razorpay Webhook
  app.post("/api/razorpay/webhook", async (req, res) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!secret) return res.status(500).json({ error: "Webhook secret missing" });

      const signature = req.headers['x-razorpay-signature'] as string;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: "Invalid signature" });
      }
      
      const { event, payload } = req.body;
      const paymentEntity = payload?.payment?.entity;
      
      if (event === 'payment.captured' || event === 'order.paid') {
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;
        const campaignId = paymentEntity.notes?.campaignId || paymentEntity.notes?.campaign_id;
        
        const existing = await dbAdm.collection('payments').where('transactionId', '==', paymentId).get();
        if (existing.empty) {
           await dbAdm.collection('payments').add({
             transactionId: paymentId,
             orderId: orderId,
             amount: paymentEntity.amount / 100,
             status: 'SUCCESS',
             createdAt: FieldValue.serverTimestamp(),
             isWebhookTriggered: true,
             customerId: paymentEntity.notes?.customerId || 'UNKNOWN',
             campaignId: campaignId || 'PENDING'
           });
           
           if (campaignId) {
              await dbAdm.collection('campaigns').doc(campaignId).update({
                status: 'ACTIVE',
                paymentReceived: true,
                updatedAt: FieldValue.serverTimestamp()
              });
           }
        }
      }
      res.json({ status: 'ok' });
    } catch (err: any) {
      console.error("[WEBHOOK] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API: Demo Setup (Internal)
  app.post("/api/demo/setup", async (req, res) => {
    try {
        await createDemoCampaign(dbAdm);
        res.json({ status: "success" });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
  });

  // Gemini AI Chat Route
  app.post("/api/chat", async (req, res) => {
    const { message, history, language = 'English', role = 'user', systemContext = {} } = req.body;
    const ai = getGeminiAI();
    if (!ai) return res.status(500).json({ error: "Gemini AI not configured" });

    try {
      let systemInstruction = `You are AutoAd AI, a helpful support assistant for AutoAd Pro, an Indian vehicle advertising platform. 
      The user's preferred language is ${language}.
      Context:
      - AutoAd Pro helps drivers earn by placing ads on their vehicles.
      - Devices must be active and connected to show ads.
      - Payments are processed within 48 hours.
      - Safety on road is top priority.
      
      CURRENT SYSTEM DATA:
      ${JSON.stringify(systemContext, null, 2)}`;

      if (role === 'admin') {
        systemInstruction += `\nYou are currently acting as the "Admin's AI Secretary". 
        Rules:
        1. Be CASUAL but EFFICIENT. Address them as "Admin" frequently.
        2. EXTREMELY SHORT ANSWERS. One sentence if possible.
        3. Tone: Sharp, professional, loyal.
        4. Use the CURRENT SYSTEM DATA provided above to answer specific questions about fleet performance.`;
      } else if (role === 'customer') {
        systemInstruction += `\nYou are the "Ads Expert" for customers.
        Rules:
        1. Be helpful and encouraging.
        2. EXTREMELY SHORT ANSWERS.
        3. Remind them to complete payment for pending campaigns or upload media for approved ones.
        4. Refer to their balance or campaigns if present in the data.`;
      } else if (role === 'driver') {
        systemInstruction += `\nYou are the "Fleet Support" for drivers.
        Rules:
        1. Be helpful and encouraging.
        2. EXTREMELY SHORT ANSWERS.
        3. Encourage them to stay online to maximize earnings.
        4. Use their current stats (earnings, hours) to motivate them.`;
      }

      const chat = ai.chats.create({ 
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: systemInstruction
        },
        history: history.map((h: any) => ({
          role: h.role,
          parts: h.parts
        }))
      });

      const result = await chat.sendMessage({ message });
      const text = result.text;
      
      res.json({ text });
    } catch (error: any) {
      console.error("[SERVER] Gemini Chat Error:", error);
      res.status(500).json({ error: "Failed to process chat" });
    }
  });

  // Emergency manual activation route
  app.post("/debug/activate-campaign", async (req, res) => {
    console.log("[SERVER] [EMERGENCY DEBUG ENDPOINT] Manual activation request received");
    const { campaignId } = req.body;
    console.log("  - campaignId targeted:", campaignId);
    try {
      if (!campaignId) {
        return res.status(400).json({ error: "Missing campaignId" });
      }
      
      const targetPath = `campaigns/${campaignId}`;
      console.log("  - Firestore path targeted for manual activation:", targetPath);
      
      await dbAdm.collection('campaigns').doc(campaignId).set({
        status: 'ACTIVE',
        paymentReceived: true,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log("  - Firestore write result: SUCCESS manually activated campaign:", campaignId);
      return res.status(200).json({ success: true, message: "activated" });
    } catch (error: any) {
      console.error("  - Firestore write error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API 404 handler
  app.use("/api", (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`
    });
  });

  // Static Assets and SPA Fallback
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    
    // Explicitly handle all other requests by serving transformed index.html
    app.get("*all", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) return next();
      
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  // GLOBAL ERROR HANDLER
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("SERVER ERROR:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Server error"
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log("[MANDATORY CHECK STAGE 1] Registered backend startup payment routes:");
    console.log("  - POST /debug/activate-campaign (Emergency Manual Activation)");
    
    console.log("[MANDATORY CHECK STAGE 7/8] Backend Firebase Project Settings:");
    console.log("  - Project ID from config/env:", firebaseProjectId);
    console.log("  - Firestore Database ID in use:", firebaseDatabaseId);
  });
}

startServer().catch(err => {
  console.error("CRITICAL SERVER STARTUP ERROR:", err);
  process.exit(1);
});
