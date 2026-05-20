import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { getDb } from '../../lib/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
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
        return res.status(400).json({ error: "Invalid signature" });
      }
      
      const db = getDb();
      const event = req.body.event;
      const paymentEntity = req.body.payload?.payment?.entity;
      
      if (event === 'payment.captured' || event === 'order.paid') {
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;
        const campaignIdFromNotes = paymentEntity.notes?.campaignId || paymentEntity.notes?.campaign_id;
        
        const paymentsRef = db.collection('payments');
        const existingPayment = await paymentsRef.where('transactionId', '==', paymentId).get();
        
        if (existingPayment.empty) {
           await paymentsRef.add({
             transactionId: paymentId,
             orderId: orderId,
             amount: paymentEntity.amount / 100,
             status: 'SUCCESS',
             paymentMethod: 'razorpay',
             createdAt: FieldValue.serverTimestamp(),
             gatewayResponse: paymentEntity,
             isWebhookTriggered: true,
             customerId: paymentEntity.notes?.customerId || paymentEntity.notes?.user_uid || 'UNKNOWN',
             campaignId: campaignIdFromNotes || 'PENDING'
           });
           
           if (campaignIdFromNotes) {
              await db.collection('campaigns').doc(campaignIdFromNotes).update({
                status: 'ACTIVE',
                paymentStatus: 'PAID',
                paymentReceived: true,
                updatedAt: FieldValue.serverTimestamp()
              });
           }
        }
      }

      return res.status(200).json({ status: 'ok' });
    } catch (err: any) {
      console.error("[WEBHOOK] Error:", err);
      return res.status(500).json({ error: err.message });
    }
}
