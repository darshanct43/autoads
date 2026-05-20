import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { getDb } from '../../lib/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, campaignData, planData, uid } = req.body;
    const finalCampaignId = req.body.campaignId || (campaignData && (campaignData.campaignId || campaignData.id));

    const secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET;
    
    if (!secret) return res.status(500).json({ success: false, error: "Razorpay Secret missing" });

    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) return res.status(400).json({ success: false, error: "Invalid payment signature" });

    try {
        const db = getDb();
        const paymentsRef = db.collection('payments');

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
        
        await paymentsRef.add(paymentRecord);

        if (finalCampaignId) {
            await db.collection('campaigns').doc(finalCampaignId).set({
              status: 'ACTIVE',
              paymentStatus: 'PAID',
              paymentReceived: true,
              updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
        } else if (campaignData) {
            await db.collection('campaigns').add({
              ...campaignData,
              status: 'ACTIVE',
              paymentStatus: 'PAID',
              paymentReceived: true,
              updatedAt: FieldValue.serverTimestamp()
            });
        }

        return res.status(200).json({ 
            success: true, 
            status: "SUCCESS", 
            paymentId: razorpay_payment_id, 
            orderId: razorpay_order_id
        });
    } catch (error: any) {
        console.error("verify-payment error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
