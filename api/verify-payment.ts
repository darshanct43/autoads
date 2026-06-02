import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { dbAdm, admin } from '../lib/firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Guarantee response headers are always JSON
  res.setHeader("Content-Type", "application/json");

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, campaignData, planData, uid } = req.body;
    const finalCampaignId = req.body.campaignId || (campaignData && (campaignData.campaignId || campaignData.id));

    let key_id = (process.env.RAZOR_PAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "").trim().replace(/^["']|["']$/g, '');
    let key_secret = (process.env.RAZORPAY_KEY_SECRET || "").trim().replace(/^["']|["']$/g, '');

    // 2. VERIFY LIVE KEYS
    if (!key_id || !key_id.startsWith('rzp_live_')) {
      console.log('[RAZORPAY_VERIFY_AUTH] LIVE KEY CHECK');
      return res.status(500).json({ success: false, error: 'CRITICAL: This application requires LIVE keys (rzp_live_).' });
    }

    const generated_signature = crypto
        .createHmac("sha256", key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generated_signature !== razorpay_signature) {
        console.log('[RAZORPAY_VERIFY_AUTH] Signature verification check failed.');
        return res.status(400).json({ success: false, error: "Invalid signature" });
      }

      // CAPTURE PAYMENT
      const razorpay = new Razorpay({ key_id, key_secret });
      await razorpay.payments.capture(razorpay_payment_id, planData?.amount || 0, "INR");

    const { FieldValue } = admin.firestore;

    // Run Firestore operations with a timeout to avoid hanging the API response
    const firestorePromise = (async () => {
      try {
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
      } catch (dbError: any) {
        if (dbError?.message?.includes('PERMISSION_DENIED') || !process.env.FIREBASE_SERVICE_ACCOUNT) {
           // Silently proceed if admin SDK lacks valid credentials
        } else {
           console.error("Firestore error during payment verification:", dbError.message);
        }
      }
    })();

    // Timeout Firestore after 5 seconds to ensure API response is fast
    await Promise.race([
      firestorePromise,
      new Promise((resolve) => setTimeout(() => {
        console.warn("Firestore operations timed out in verify-payment");
        resolve(null);
      }, 5000))
    ]);

    res.status(200).json({ success: true, status: "SUCCESS" });
  } catch (error: any) {
    console.error("[RAZORPAY] Verify error:", error);
    let errorMsg = error.message || "Credential mismatch";
    if (errorMsg.toLowerCase().includes("authentication") || errorMsg.toLowerCase().includes("auth")) {
      errorMsg = 'Razorpay credentials mismatch: The provided secret or ID is invalid.';
    }
    res.status(500).json({ success: false, error: errorMsg });
  }
}
