import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { dbAdm, admin } from './_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, campaignData, planData, uid } = req.body;
    const finalCampaignId = req.body.campaignId || (campaignData && (campaignData.campaignId || campaignData.id));

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return res.status(500).json({ error: "Razorpay Secret missing" });

    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: "Invalid signature" });
    }

    const { FieldValue } = admin.firestore;

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
}
