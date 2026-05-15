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

const Razorpay = (RazorpayConstructor as any).default || RazorpayConstructor;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // Firebase Admin Init
  if (!getApps().length) {
    const rawSA = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (rawSA && rawSA.trim()) {
      try {
        let serviceAccount;
        const trimmedSA = rawSA.trim();
        if (trimmedSA.startsWith('{')) {
          serviceAccount = JSON.parse(trimmedSA);
          if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
          }
          initializeApp({
            credential: cert(serviceAccount)
          });
          console.log("[SERVER] Firebase initialized with Service Account");
        } else {
          console.error("[SERVER] FIREBASE_SERVICE_ACCOUNT is not a JSON. Starts with:", trimmedSA.substring(0, 20));
          initializeApp();
        }
      } catch (e) {
        console.error("[SERVER] Failed to parse FIREBASE_SERVICE_ACCOUNT", e);
        initializeApp();
      }
    } else {
      initializeApp();
      console.log("[SERVER] Firebase initialized with Default Credentials");
    }
  }
  const dbAdm = getFirestore();

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

  // API Routes
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
      res.json(order);
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
      return res.status(500).json({ error: "Razorpay Secret missing" });
    }

    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    try {
      const campaignDataToSave = {
        ...campaignData,
        status: 'PAID',
        paymentStatus: 'PAID',
        paymentReceived: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      const campaignRef = await dbAdm.collection('campaigns').add(campaignDataToSave);

      await dbAdm.collection('payments').add({
        campaignId: campaignRef.id,
        orderId: razorpay_order_id,
        transactionId: razorpay_payment_id,
        amount: planData.amount,
        status: 'SUCCESS',
        customerId: uid,
        paymentMethod: 'razorpay',
        verifiedAt: FieldValue.serverTimestamp(),
        gatewayResponse: { razorpay_payment_id, razorpay_order_id }
      });

      res.json({ status: "success", campaignId: campaignRef.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
