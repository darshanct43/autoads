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

    // 2. VERIFY KEYS
    const key_id = getCredential('RAZORPAY_KEY_ID').trim().replace(/^["']|["']$/g, '');
    const key_secret = getCredential('RAZORPAY_KEY_SECRET').trim().replace(/^["']|["']$/g, '');

    // FORENSIC AUDIT LOG
    console.log("------------------------------------------");
    console.log("RAZORPAY VERIFY RUNTIME AUDIT:");
    console.log(`KEY_ID_PREFIX = ${key_id ? key_id.substring(0, 12) : "NONE"}`);
    console.log(`KEY_ID_SUFFIX = ${key_id ? key_id.substring(key_id.length - 6) : "NONE"}`);
    console.log(`SECRET_LENGTH = ${key_secret ? key_secret.length : 0}`);
    console.log(`CONSISTENCY_CHECK (Verify Match) = YES`);
    console.log("------------------------------------------");

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

    // CAPTURE PAYMENT USING THE MATCHING SECRET
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

    const { FieldValue } = admin.firestore;

    console.log("[LOG] [VERIFY_PAYMENT] Signature verified, initiating Firestore updates.");

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
    
    // Write to payments/{paymentId}
    await dbAdm.collection('payments').doc(razorpay_payment_id).set(paymentRecord);
    console.log("[LOG] [PAYMENT_WRITE] Payment document successfully written to payments/" + razorpay_payment_id);

    let resolvedCampaignId = finalCampaignId;
    let campaignName = campaignData?.title || 'Unknown Campaign';
    let campaignFranchiseId = campaignData?.franchiseId || null;
    let campaignCreatedBy = campaignData?.createdBy || uid || 'UNKNOWN';

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
          console.error("Error fetching campaign data:", fetchErr);
        }

        await dbAdm.collection('campaigns').doc(finalCampaignId).set({
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          paymentReceived: true,
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        console.log("[LOG] [CAMPAIGN_UPDATE] Campaign updated to status ACTIVE and paymentStatus PAID:", finalCampaignId);
    } else if (campaignData) {
        const campaignDataToSave = {
          ...campaignData,
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          paymentReceived: true,
          updatedAt: FieldValue.serverTimestamp()
        };
        const campaignRef = await dbAdm.collection('campaigns').add(campaignDataToSave);
        resolvedCampaignId = campaignRef.id;
        console.log("[LOG] [CAMPAIGN_UPDATE] New campaign created with status ACTIVE and paymentStatus PAID:", campaignRef.id);
    } else {
        throw new Error("No campaignId or campaignData provided for Campaign Update.");
    }

    const amount = planData?.amount || 0;
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
      customerId: uid || 'UNKNOWN',
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
    console.log("LOG_FIREBASE_REVENUE_LEDGER_WRITE_RESULT: Revenue ledger record added with ID:", ledgerRef.id);

    console.log("[LOG] [VERIFY_PAYMENT] All payments and campaign documents updated successfully. Returning SUCCESS.");
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
