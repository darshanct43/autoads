import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { dbAdm, admin } from './_lib/firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Cashfree webhook signature
  const signature = req.headers['x-webhook-signature'] as string;
  const timestamp = req.headers['x-webhook-timestamp'] as string;
  
  if (!signature || !timestamp) {
    return res.status(400).json({ error: 'Missing webhook signature or timestamp' });
  }
  
  const rawBody = JSON.stringify(req.body);
  const secret = process.env.CASHFREE_SECRET_KEY || '';
  
  const signedString = `${timestamp}${rawBody}`;
  const generatedSignature = crypto.createHmac('sha256', secret).update(signedString).digest('base64');
  
  if (generatedSignature !== signature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  
  try {
    const { type, data } = req.body;
    const { FieldValue } = admin.firestore;
    
    if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderId = data.order.order_id;
      const paymentId = data.payment.cf_payment_id;
      
      const existingPayments = await dbAdm.collection('payments').where('transactionId', '==', paymentId).get();
      if (!existingPayments.empty) {
        return res.status(200).json({ status: 'already_processed' });
      }
      
      await dbAdm.collection('payments').add({
        transactionId: paymentId,
        orderId: orderId,
        amount: data.payment.payment_amount,
        status: 'PAID',
        paymentMethod: 'cashfree',
        createdAt: FieldValue.serverTimestamp(),
        verifiedAt: FieldValue.serverTimestamp(),
        isWebhookTriggered: true
      });
      
      const campaigns = await dbAdm.collection('campaigns').where('paymentOrderId', '==', orderId).get();
      campaigns.forEach(async (doc) => {
        await doc.ref.update({
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          paymentReceived: true,
          updatedAt: FieldValue.serverTimestamp()
        });
      });
      
    } else if (type === 'PAYMENT_FAILED_WEBHOOK') {
      const paymentId = data.payment.cf_payment_id;
      await dbAdm.collection('payments').add({
        transactionId: paymentId,
        status: 'FAILED',
        createdAt: FieldValue.serverTimestamp(),
        paymentMethod: 'cashfree'
      });
    }
    
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error("Cashfree webhook error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
