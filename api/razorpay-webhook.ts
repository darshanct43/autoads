import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { dbAdm, admin } from '../lib/firebase-admin.js';
import { getCredential } from '../lib/env.js';

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-razorpay-signature'] || '';
    const webhookSecret = getCredential('RAZORPAY_WEBHOOK_SECRET') || '';

    // If webhook secret is configured, verify the signature
    if (webhookSecret) {
      if (!signature) {
        console.warn("[WEBHOOK] Missing x-razorpay-signature header although RAZORPAY_WEBHOOK_SECRET is set.");
        return res.status(400).json({ success: false, error: "Missing signature" });
      }

      const bodyBuffer = req.rawBody;
      if (!bodyBuffer) {
        console.error("[WEBHOOK] rawBody buffer is missing. Ensure express.json is configured with a verify callback.");
        return res.status(400).json({ success: false, error: "Missing raw body" });
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyBuffer)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.error("[WEBHOOK] Signature verification failed.");
        return res.status(400).json({ success: false, error: "Invalid signature verification" });
      }

      console.log("[WEBHOOK] Cryptographic webhook signature verified successfully.");
    } else {
      console.log("[WEBHOOK] Webhook received. (Signature verification skipped because RAZORPAY_WEBHOOK_SECRET is not configured).");
    }

    const event = req.body.event;
    console.log(`[WEBHOOK] Received Razorpay event: ${event}`);

    // We process payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = req.body.payload?.payment?.entity;
      if (!paymentEntity) {
        console.warn("[WEBHOOK] Payload has no payment entity.");
        return res.status(400).json({ success: false, error: "Missing payment entity" });
      }

      const razorpay_payment_id = paymentEntity.id;
      const razorpay_order_id = paymentEntity.order_id;
      const amountPaise = paymentEntity.amount || 0;
      const amount = amountPaise / 100;

      const notes = paymentEntity.notes || {};
      const uid = notes.user_uid || notes.customerId || 'UNKNOWN';
      const finalCampaignId = notes.campaignId || '';

      console.log(`[WEBHOOK] Processing payment: ${razorpay_payment_id} | Order: ${razorpay_order_id} | Amount: ${amount} | Campaign: ${finalCampaignId}`);

      if (!razorpay_payment_id) {
        return res.status(400).json({ success: false, error: "Missing payment id" });
      }

      const { FieldValue } = admin.firestore;

      // Ensure idempotency: check if payment already recorded as SUCCESS
      const paymentDocRef = dbAdm.collection('payments').doc(razorpay_payment_id);
      const paymentDoc = await paymentDocRef.get();
      if (paymentDoc.exists) {
        const data = paymentDoc.data();
        if (data && data.status === 'SUCCESS') {
          console.log(`[WEBHOOK] Payment ${razorpay_payment_id} already marked as SUCCESS in database. Skipping duplicate processing.`);
          return res.status(200).json({ success: true, message: "Payment already successfully processed" });
        }
      }

      console.log("[WEBHOOK] Writing payment record to Firestore.");
      const paymentRecord = {
        transactionId: razorpay_payment_id,
        orderId: razorpay_order_id || 'UNKNOWN',
        amount: amount,
        status: 'SUCCESS',
        paymentMethod: paymentEntity.method || 'razorpay',
        createdAt: FieldValue.serverTimestamp(),
        verifiedAt: FieldValue.serverTimestamp(),
        customerId: uid,
        campaignId: finalCampaignId || notes.title || 'PENDING',
        isWebhookTriggered: true
      };

      await paymentDocRef.set(paymentRecord);
      console.log(`[WEBHOOK] Payment record successfully written to payments/${razorpay_payment_id}`);

      let resolvedCampaignId = finalCampaignId;
      let campaignName = notes.title || 'Unknown Campaign';
      let campaignFranchiseId = null;
      let campaignCreatedBy = uid;

      if (finalCampaignId) {
        try {
          const campaignDoc = await dbAdm.collection('campaigns').doc(finalCampaignId).get();
          if (campaignDoc.exists) {
            const data = campaignDoc.data();
            if (data) {
              if (data.title) campaignName = data.title;
              if (data.franchiseId) campaignFranchiseId = data.franchiseId;
              if (data.createdBy) campaignCreatedBy = data.createdBy;
            }
          }
        } catch (fetchErr) {
          console.error("[WEBHOOK] Error fetching campaign data:", fetchErr);
        }

        await dbAdm.collection('campaigns').doc(finalCampaignId).set({
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          paymentReceived: true,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`[WEBHOOK] Campaign ${finalCampaignId} successfully activated and marked as PAID.`);
      } else {
        // Fallback or create if browser closed before completing campaign pre-creation?
        // Usually CustomerPortal pre-creates campaign before checkout opens.
        console.warn("[WEBHOOK] No finalCampaignId in notes. Unable to activate any pre-created campaign.");
      }

      // Add revenue ledger record
      const isFranchiseCampaign = campaignFranchiseId && campaignFranchiseId !== 'HQ' && campaignFranchiseId !== 'global' && campaignFranchiseId !== 'UNASSIGNED';
      const source = isFranchiseCampaign ? 'FRANCHISE' : 'HQ';
      
      let franchiseRevenue = 0;
      let platformRevenue = amount;
      
      if (source === 'FRANCHISE') {
        franchiseRevenue = amount * 0.70;
        platformRevenue = amount * 0.30;
      }

      const ledgerRecord = {
        paymentId: razorpay_payment_id,
        campaignId: resolvedCampaignId || 'PENDING',
        campaignName: campaignName,
        customerId: uid,
        amount: amount,
        grossRevenue: amount,
        platformRevenue: platformRevenue,
        franchiseAmount: franchiseRevenue,
        franchiseRevenue: franchiseRevenue,
        source: source,
        franchiseId: campaignFranchiseId || null,
        status: 'PENDING_SETTLEMENT',
        createdAt: FieldValue.serverTimestamp()
      };

      const ledgerRef = await dbAdm.collection('revenueLedger').add(ledgerRecord);
      console.log(`[WEBHOOK] Revenue ledger record created with ID: ${ledgerRef.id}`);
    }

    return res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error("[WEBHOOK] Webhook handler error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
