import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdmin, getRazorpay } from '../_lib';
import crypto from 'crypto';
import * as admin from 'firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature,
    campaignData,
    planData,
    uid
  } = req.body;

  const secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error("[PAYMENT] Razorpay Secret missing on server.");
    return res.status(500).json({ error: "Razorpay Secret missing on server (RAZORPAY_KEY_SECRET)." });
  }

  const generated_signature = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generated_signature !== razorpay_signature) {
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  try {
    const adminAppInstance = getAdmin();
    if (adminAppInstance) {
      const dbAdm = adminAppInstance.db;
      
      // 1. Create Campaign
      const campaignRef = await dbAdm.collection('campaigns').add({
        ...campaignData,
        status: 'PAID',
        paymentStatus: 'PAID',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 2. Record Payment
      await dbAdm.collection('payments').add({
        campaignId: campaignRef.id,
        orderId: razorpay_order_id,
        transactionId: razorpay_payment_id,
        amount: planData.amount,
        status: 'SUCCESS',
        customerId: uid,
        paymentMethod: 'razorpay',
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        gatewayResponse: { razorpay_payment_id, razorpay_order_id }
      });

      return res.status(200).json({ status: "success", campaignId: campaignRef.id });
    } else {
      return res.status(500).json({ error: "Admin SDK not available" });
    }
  } catch (error: any) {
    console.error("[PAYMENT] Verification Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
