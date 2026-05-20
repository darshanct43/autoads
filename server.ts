import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import RazorpayConstructor from "razorpay";
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import cors from 'cors';
import multer from 'multer';
import { uploadToS3 } from './src/services/awsService.js';
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
async function createDemoCampaign() {
    const db = getFirestore(firebaseConfig.firestoreDatabaseId);
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
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

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

  // API Routes
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

  // API: Send OTP
  app.post("/api/otp/send", async (req, res) => {
    const { phoneNumber } = req.body;
    const twilio = getTwilioClient();
    if (!twilio) return res.status(500).json({ error: "Twilio not configured" });

    try {
      const verification = await twilio.client.verify.v2.services(twilio.serviceSid)
        .verifications.create({ to: phoneNumber, channel: 'sms' });
      res.json({ status: "success", sid: verification.sid });
    } catch (error: any) {
      if (error.code === 21608) {
        console.warn("[SERVER] Twilio send warning: Unverified phone number (trial account limitation).");
        res.status(403).json({ error: "Trial account limit: Please verify this phone number in your Twilio console to receive messages." });
      } else {
        console.error("[SERVER] Twilio send error:", error);
        res.status(500).json({ error: error.message || "Failed to send OTP" });
      }
    }
  });

  // API: Verify OTP
  app.post("/api/otp/verify", async (req, res) => {
    const { phoneNumber, code } = req.body;
    const twilio = getTwilioClient();
    if (!twilio) return res.status(500).json({ error: "Twilio not configured" });

    try {
      const verificationCheck = await twilio.client.verify.v2.services(twilio.serviceSid)
        .verificationChecks.create({ to: phoneNumber, code: code });
      
      if (verificationCheck.status === 'approved') {
          res.json({ status: "approved" });
      } else {
          res.status(400).json({ error: "Invalid code" });
      }
    } catch (error: any) {
      if (error.code === 21608) {
        console.warn("[SERVER] Twilio verify warning: Unverified phone number (trial account limitation).");
        res.status(403).json({ error: "Trial account limit: Please verify this phone number in your Twilio console." });
      } else {
        console.error("[SERVER] Twilio verify error:", error);
        res.status(500).json({ error: error.message || "Failed to verify OTP" });
      }
    }
  });

  app.post("/api/razorpay/create-order", async (req, res) => {
    console.log("[SERVER] Order Creation Request Received");
    const { amount, currency, notes } = req.body;
    try {
      const razorpay = getRazorpay();
      if (!razorpay) {
        console.error("[SERVER] Razorpay credentials missing");
        return res.status(500).json({ error: "Razorpay credentials missing" });
      }

      console.log("[SERVER] Creating Order for amount:", amount);
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: currency || "INR",
        notes: notes || {}
      }).catch(err => {
        console.error("[RAZORPAY_SDK_ERROR]", err);
        throw err;
      });
      console.log("[SERVER] Order Created Successfully:", order.id);
      res.json({ ...order, key_id: process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID });
    } catch (error: any) {
      console.error("[SERVER] create-order endpoint failed:", error);
      res.status(500).json({ error: error.description || error.message || "Failed to create order" });
    }
  });

  app.post("/api/razorpay/verify-payment", async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, campaignData, planData, uid } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET;
    
    if (!secret) {
      console.error("[SERVER] Razorpay Secret missing");
      return res.status(500).json({ success: false, status: "FAILED", error: "Razorpay Secret missing" });
    }

    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, status: "FAILED", error: "Invalid payment signature" });
    }

    try {
      console.log("[SERVER] Verifying payment for:", razorpay_payment_id);
      console.log("[SERVER] Payload Check:", { razorpay_order_id, razorpay_payment_id, hasSignature: !!razorpay_signature });
      console.log("[SERVER] Request body:", JSON.stringify(req.body));
      
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        console.error("[SERVER] Verification failed: Missing parameters. Params:", { razorpay_order_id, razorpay_payment_id, razorpay_signature });
        return res.status(400).json({ 
          success: false, 
          status: "FAILED", 
          error: "Missing required verification parameters (id/signature)",
          message: "Could not verify payment due to missing data"
        });
      }

      console.log("[SERVER] Generated signature:", generated_signature);
      console.log("[SERVER] Received signature:", razorpay_signature);
      
      // Return success JSON immediately to the frontend to unblock the UI
      console.log("[SERVER] Signature verified successfully. Saving to Firestore...");
      
      const paymentsRef = dbAdm.collection('payments');
      const paymentRecord = {
        transactionId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: planData.amount,
        status: 'SUCCESS',
        paymentMethod: 'razorpay',
        createdAt: FieldValue.serverTimestamp(),
        verifiedAt: FieldValue.serverTimestamp(),
        customerId: uid || 'UNKNOWN',
        campaignId: campaignData?.title || 'PENDING',
        isWebhookTriggered: false
      };
      
      console.log("[SERVER] Payment record to save:", JSON.stringify(paymentRecord));
      await paymentsRef.add(paymentRecord);
      console.log("[SERVER] Payment record saved to Firestore successfully.");

      if (campaignData) {
          console.log("[SERVER] Activating campaign:", campaignData.title);
          const campaignDataToSave = {
            ...campaignData,
            status: 'PAID',
            paymentStatus: 'PAID',
            paymentReceived: true,
            updatedAt: FieldValue.serverTimestamp()
          };
          console.log("[SERVER] Saving campaign data:", JSON.stringify(campaignDataToSave));
          await dbAdm.collection('campaigns').add(campaignDataToSave);
          console.log("[SERVER] Campaign activated successfully.");
      }

      console.log("[SERVER] Generating success response...");
      
      const responseBody = { 
        success: true, 
        status: "SUCCESS", 
        paymentId: razorpay_payment_id, 
        orderId: razorpay_order_id,
        message: "Payment signature verified and record saved",
        serverTime: new Date().toISOString()
      };
      
      console.log("[SERVER] Sending success response:", JSON.stringify(responseBody));
      return res.status(200).json(responseBody);
    } catch (error: any) {
      console.error("[SERVER] Verification Runtime Error:", error);
      return res.status(500).json({ 
        success: false, 
        status: "FAILED", 
        error: error.message || "Internal server error during verification",
        message: "Server encountered an error during verification"
      });
    }
  });

  // Razorpay Webhook Handler
  app.post("/api/razorpay/webhook", express.json(), async (req, res) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!secret) return res.status(500).json({ error: "Webhook secret not configured" });

      const signature = req.headers['x-razorpay-signature'] as string;
      if (!signature) return res.status(400).json({ error: "Missing signature" });

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error("[WEBHOOK] Invalid signature");
        return res.status(400).json({ error: "Invalid signature" });
      }

      console.log("[WEBHOOK] Valid Signature Received");
      console.log("[WEBHOOK] Request body:", JSON.stringify(req.body));
      const event = req.body.event;
      const paymentEntity = req.body.payload?.payment?.entity;
      console.log("[WEBHOOK] Processing event:", event, "Payment ID:", paymentEntity?.id);

      if (!paymentEntity) {
        console.error("[WEBHOOK] No payment payload found.");
        return res.status(400).json({ error: "No payment payload" });
      }

      if (event === 'payment.captured' || event === 'order.paid') {
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;
        console.log("[WEBHOOK] Payment Captured/Paid. Order ID:", orderId, "Payment ID:", paymentId);
        
        // Find if payment already exists via transactionId to prevent duplicate processing
        const paymentsRef = dbAdm.collection('payments');
        const existingPayment = await paymentsRef.where('transactionId', '==', paymentId).get();
        console.log("[WEBHOOK] Checking existing payment record for:", paymentId);
        
        if (existingPayment.empty) {
           console.log("[WEBHOOK] No existing payment found. Capturing late payment:", paymentId);
           // Handle case where verify hook didn't happen but webhook did (fallback)
           const newRecord = {
             transactionId: paymentId,
             orderId: orderId,
             amount: paymentEntity.amount / 100,
             status: 'SUCCESS',
             paymentMethod: 'razorpay',
             createdAt: FieldValue.serverTimestamp(),
             gatewayResponse: paymentEntity,
             isWebhookTriggered: true,
             customerId: paymentEntity.notes?.customerId || paymentEntity.notes?.user_uid || 'UNKNOWN',
             campaignId: paymentEntity.notes?.campaignId || 'PENDING_CAMPAIGN_RESOLUNTION'
           };
           console.log("[WEBHOOK] Saving new payment record:", JSON.stringify(newRecord));
           await paymentsRef.add(newRecord);
           console.log("[WEBHOOK] New payment record saved successfully.");
           
           if (paymentEntity.notes?.campaignId) {
              console.log("[WEBHOOK] Updating campaign status for:", paymentEntity.notes.campaignId);
              await dbAdm.collection('campaigns').doc(paymentEntity.notes.campaignId).update({
                status: 'PAID',
                paymentStatus: 'PAID',
                paymentReceived: true,
                updatedAt: FieldValue.serverTimestamp()
              });
              console.log("[WEBHOOK] Campaign status updated to PAID.");
           }
        } else {
           console.log("[WEBHOOK] Payment record already exists. Payment already verified. Updating record if needed.");
           existingPayment.docs.forEach(async doc => {
               console.log("[WEBHOOK] Updating existing record:", doc.id);
               await doc.ref.update({
                  webhookStatus: 'RCVD',
                  status: 'SUCCESS', // Update in case it was recorded as pending or failed
                  webhookReceivedAt: FieldValue.serverTimestamp()
               });
               console.log("[WEBHOOK] Existing record updated successfully.");
           });
        }
      } else if (event === 'payment.failed') {
         console.log(`[WEBHOOK] Payment Failed for ${paymentEntity.id}`);
         const paymentsRef = dbAdm.collection('payments');
         const existingPayment = await paymentsRef.where('transactionId', '==', paymentEntity.id).get();
         
         if (existingPayment.empty) {
             await paymentsRef.add({
                 transactionId: paymentEntity.id || 'UNKNOWN',
                 orderId: paymentEntity.order_id,
                 amount: (paymentEntity.amount || 0) / 100,
                 status: 'FAILED',
                 failureReason: paymentEntity.error_description || paymentEntity.error_reason || 'Gateway reported failure',
                 paymentMethod: 'razorpay',
                 createdAt: FieldValue.serverTimestamp(),
                 gatewayResponse: paymentEntity,
                 isWebhookTriggered: true,
                 customerId: paymentEntity.notes?.customerId || paymentEntity.notes?.user_uid || 'UNKNOWN',
                 campaignId: paymentEntity.notes?.campaignId || ''
             });
         } else {
             existingPayment.docs.forEach(async doc => {
                 await doc.ref.update({
                    status: 'FAILED',
                    failureReason: paymentEntity.error_description || paymentEntity.error_reason || 'Gateway reported failure',
                    webhookStatus: 'RCVD'
                 });
             });
         }
      }

      res.status(200).json({ status: 'ok' });
    } catch (err: any) {
      console.error("[WEBHOOK] Error processing webhook:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/payment/status", async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    
    try {
      if (!firebaseProjectId) {
         return res.status(500).json({ success: false, error: "Firebase project not configured on server" });
      }

      // Simple where query to avoid index requirement for composite orderBy
      const paymentsSnapshot = await dbAdm.collection('payments')
        .where('customerId', '==', userId)
        .get();
      
      if (paymentsSnapshot.empty) {
        console.log(`[SERVER] No payments found for ${userId}`);
        console.log("RETURNING JSON (PENDING)");
        return res.json({ success: true, paymentStatus: "PENDING", details: "No records found" });
      }
      
      // Sort in memory to avoid index requirement
      const payments: any[] = paymentsSnapshot.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data().createdAt ? (doc.data().createdAt as any).toMillis() : 0
      }));
      
      payments.sort((a: any, b: any) => b.createdAt - a.createdAt);
      const payment = payments[0];

      console.log("PAYMENT FOUND", payment);
      console.log(`[SERVER] Latest payment status for ${userId}: ${payment.status}`);
      console.log("RETURNING JSON (SUCCESS/PAID check)");
      
      return res.status(200).json({ 
        success: true,
        paymentStatus: payment.status || "PENDING",
        subscription: payment.status === 'SUCCESS' || payment.status === 'PAID' ? 'ACTIVE' : 'INACTIVE'
      });
    } catch (e: any) {
      console.error("[SERVER] Status check error details:", e);
      // Ensure we return JSON even on error
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ 
        success: false,
        error: e.message || "Internal Database Error",
        code: e.code,
        details: e.details || "Check server logs for PERMISSION_DENIED or API activation issues"
      });
    }
  });

  // API: Demo Setup (Internal)
  app.post("/api/demo/setup", async (req, res) => {
    try {
        await createDemoCampaign();
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

  // 404 for API
  app.all("/api/*all", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
