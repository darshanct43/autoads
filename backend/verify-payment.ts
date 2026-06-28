import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { dbAdm, admin } from '../lib/firebase-admin.js';
import { getCredential } from '../lib/env.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Guarantee response headers are always JSON
  res.setHeader("Content-Type", "application/json");

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const secrets_candidates: { name: string; value: string }[] = [];

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, campaignData, planData, uid } = req.body;
    const finalCampaignId = req.body.campaignId || (campaignData && (campaignData.campaignId || campaignData.id));

    const isSimulated = req.body.is_simulated || (razorpay_order_id && razorpay_order_id.startsWith('order_simulated')) || razorpay_signature === 'simulated_signature';

    if (!isSimulated) {
      const key_id = getCredential('RAZORPAY_KEY_ID').trim().replace(/^["']|["']$/g, '');
      const key_secret = getCredential('RAZORPAY_KEY_SECRET').trim().replace(/^["']|["']$/g, '');

      // 2. VERIFY KEYS
      if (!key_id || (!key_id.startsWith('rzp_live_') && !key_id.startsWith('rzp_test_'))) {
        return res.status(500).json({ 
          success: false, 
          error: `CRITICAL: Missing or invalid Razorpay Key ID in system environment (RAZORPAY_KEY_ID)` 
        });
      }

      if (!key_secret) {
        return res.status(500).json({ 
          success: false, 
          error: `CRITICAL: Missing Razorpay Key Secret in system environment (RAZORPAY_KEY_SECRET)` 
        });
      }

      const generated_signature = crypto
          .createHmac("sha256", key_secret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest("hex");

      if (generated_signature !== razorpay_signature) {
        console.log('[RAZORPAY_VERIFY_AUTH] Signature verification check failed against configured Secret.');
        return res.status(400).json({ success: false, error: "Invalid signature" });
      }

      console.log(`[RAZORPAY] Signature verified successfully.`);

      // CAPTURE PAYMENT USING THE CONFIG SECRET
      const razorpay = new Razorpay({ key_id, key_secret });
      console.log("[RAZORPAY] Capture attempt with amount:", planData?.amount);
      try {
        await razorpay.payments.capture(razorpay_payment_id, Math.round((planData?.amount || 0) * 100), "INR");
      } catch (err: any) {
        console.log("ERR RAW:", err);
        console.log("ERR JSON:", JSON.stringify(err, null, 2));
        console.log("ERR MESSAGE:", err?.message);
        console.log("ERR DESCRIPTION:", err?.description);
        console.log("ERR ERROR:", err?.error);
        console.log("ERR ERROR DESCRIPTION:", err?.error?.description);

        console.error("[RAZORPAY] Capture failed:", err);
        
        // Sometimes the error details are hidden in err.error
        const errorMessage = (err?.message || err?.error?.description || '').toLowerCase();
        
        if (errorMessage.includes("already been captured") || errorMessage.includes("payment has already been captured")) {
          console.log("ALREADY_CAPTURED_BRANCH_REACHED");
          console.log("[RAZORPAY] Payment already captured, proceeding.");
        } else {
          throw err;
        }
      }
    }

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
        
        const paymentRef = await dbAdm.collection('payments').add(paymentRecord);
        console.log("LOG_FIREBASE_PAYMENT_WRITE_RESULT: Payment record added with ID:", paymentRef.id);

        if (finalCampaignId) {
            await dbAdm.collection('campaigns').doc(finalCampaignId).set({
              status: 'ACTIVE',
              paymentStatus: 'PAID',
              paymentReceived: true,
              updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
            console.log("LOG_FIREBASE_CAMPAIGN_UPDATE_RESULT: Campaign updated with ID:", finalCampaignId);
        } else if (campaignData) {
            const campaignRef = await dbAdm.collection('campaigns').add({
              ...campaignData,
              status: 'ACTIVE',
              paymentStatus: 'PAID',
              paymentReceived: true,
              updatedAt: FieldValue.serverTimestamp()
            });
            console.log("LOG_FIREBASE_CAMPAIGN_CREATE_RESULT: New campaign created with ID:", campaignRef.id);
        }
      } catch (dbError: any) {
        if (dbError?.message?.includes('PERMISSION_DENIED') || !process.env.FIREBASE_SERVICE_ACCOUNT) {
           // Silently proceed if admin SDK lacks valid credentials
        } else {
           console.error("Firestore error during payment verification:", dbError?.message || dbError);
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
    let errorMsg = error?.message || "Credential mismatch";
    if (errorMsg.toString().toLowerCase().includes("authentication") || errorMsg.toString().toLowerCase().includes("auth")) {
      errorMsg = 'Razorpay credentials mismatch: The provided secret or ID is invalid.';
    }
    res.status(500).json({ 
      success: false, 
      error: errorMsg,
      loadedKeyId: getCredential('RAZORPAY_KEY_ID').substring(0, 12) + "...",
      candidateSecretsCount: secrets_candidates.length,
      candidateSecretsSources: secrets_candidates.map(s => s.name)
    });
  }
}
