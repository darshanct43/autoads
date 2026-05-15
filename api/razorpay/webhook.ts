import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdmin } from '../_lib';
import crypto from 'crypto';
import * as admin from 'firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"] as string;

  if (!secret || !signature) {
    return res.status(400).send("Webhook configuration missing");
  }

  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    return res.status(400).send("invalid signature");
  }

  const { event, payload, id: webhookId } = req.body;
  const finalWebhookId = webhookId || `wh_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  try {
    const adminAppInstance = getAdmin();
    if (!adminAppInstance) {
      return res.status(500).send("Admin SDK not ready");
    }

    const dbAdm = adminAppInstance.db;

    // Idempotency Check
    const logRef = dbAdm.collection('webhookLogs').doc(finalWebhookId);
    const logSnap = await logRef.get();
    if (logSnap.exists) {
      return res.status(200).send("already processed");
    }

    await logRef.set({
      event,
      payload,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      processed: false
    });

    if (event === "payment.captured" || event === "order.paid") {
      const paymentEntity = event === "payment.captured" ? payload.payment.entity : payload.order.entity;
      const paymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id || (event === "order.paid" ? paymentEntity.id : null);

      let paymentSnap = await dbAdm.collection('payments')
        .where('transactionId', '==', paymentId)
        .get();

      if (paymentSnap.empty && orderId) {
        paymentSnap = await dbAdm.collection('payments')
          .where('orderId', '==', orderId)
          .get();
      }

      if (!paymentSnap.empty) {
        const paymentDoc = paymentSnap.docs[0];
        const paymentData = paymentDoc.data();

        if (paymentData.status !== 'SUCCESS') {
          await paymentDoc.ref.update({
            status: 'SUCCESS',
            verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            gatewayOrderId: orderId,
            gatewayResponse: paymentEntity
          });

          if (paymentData.campaignId) {
            await dbAdm.collection('campaigns').doc(paymentData.campaignId).update({
              status: 'ACTIVE',
              paymentStatus: 'PAID',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      } else if (event === "payment.captured") {
        await dbAdm.collection('payments').add({
          transactionId: paymentId,
          orderId: orderId,
          amount: paymentEntity.amount / 100,
          status: 'SUCCESS',
          customerId: paymentEntity.email || 'webhook-origin',
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          gatewayResponse: paymentEntity,
          source: 'webhook-discovery'
        });
      }
    } else if (event === "payment.failed") {
      const paymentEntity = payload.payment.entity;
      const paymentSnap = await dbAdm.collection('payments')
        .where('transactionId', '==', paymentEntity.id)
        .get();
      if (!paymentSnap.empty) {
        await paymentSnap.docs[0].ref.update({
          status: 'FAILED',
          gatewayResponse: paymentEntity,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    await logRef.update({ processed: true });
    return res.status(200).send("ok");
  } catch (e: any) {
    console.error("[PAYMENT] Webhook processing fatal error:", e.message);
    return res.status(500).send("internal error");
  }
}
