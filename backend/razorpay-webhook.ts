import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { dbAdm, admin } from './_lib/firebase-admin';
import { getCredential } from '../lib/env.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = getCredential('RAZORPAY_WEBHOOK_SECRET');
  const signature = req.headers['x-razorpay-signature'];

  if (!webhookSecret || !signature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const shasum = crypto.createHmac('sha256', webhookSecret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (digest !== signature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const { event, payload } = req.body;

  try {
    const { FieldValue } = admin.firestore;
    
    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = payload.payment.entity;
      const orderId = payload.order.entity.id;

      // Check if payment already recorded
      const existingPayments = await dbAdm.collection('payments').where('transactionId', '==', payment.id).get();
      if (!existingPayments.empty) {
        return res.status(200).json({ status: 'already_processed' });
      }

      // Record payment
      await dbAdm.collection('payments').add({
        transactionId: payment.id,
        orderId: orderId,
        amount: payment.amount / 100,
        status: 'PAID',
        paymentMethod: 'razorpay',
        createdAt: FieldValue.serverTimestamp(),
        verifiedAt: FieldValue.serverTimestamp(),
        isWebhookTriggered: true
      });

      // Find and update campaign
      const campaigns = await dbAdm.collection('campaigns').where('paymentOrderId', '==', orderId).get();
      campaigns.forEach(async (doc) => {
        await doc.ref.update({
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          paymentReceived: true,
          updatedAt: FieldValue.serverTimestamp()
        });
      });
    } else if (event === 'payment.failed') {
      const payment = payload.payment.entity;
      await dbAdm.collection('payments').add({
        transactionId: payment.id,
        status: 'FAILED',
        createdAt: FieldValue.serverTimestamp()
      });
    }
    
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
