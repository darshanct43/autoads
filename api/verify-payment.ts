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

  const secrets_candidates: { name: string; value: string }[] = [];

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, campaignData, planData, uid } = req.body;
    const finalCampaignId = req.body.campaignId || (campaignData && (campaignData.campaignId || campaignData.id));

    let key_id = (process.env.RAZOR_PAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "").trim().replace(/^["']|["']$/g, '');

    // 2. VERIFY KEYS
    if (!key_id || (!key_id.startsWith('rzp_live_') && !key_id.startsWith('rzp_test_'))) {
      console.log('[RAZORPAY_VERIFY_AUTH] VALiD KEY CHECK');
      return res.status(500).json({ 
        success: false, 
        error: `CRITICAL: Invalid Razorpay Key ID format (Loaded ID: "${key_id ? key_id.substring(0, 12) + "..." : "none"}"). Must start with rzp_live_ or rzp_test_.` 
      });
    }

    // Collect all unique candidate secrets
    const addCandidate = (name: string, raw: string | undefined) => {
      if (!raw) return;
      const clean = raw.trim().replace(/^["']|["']$/g, '');
      if (clean && !secrets_candidates.some(s => s.value === clean)) {
        secrets_candidates.push({ name, value: clean });
      }
    };

    addCandidate("RAZORPAY_KEY_SECRET", process.env.RAZORPAY_KEY_SECRET);
    addCandidate("RAZORPAY_SECRET", process.env.RAZORPAY_SECRET);
    addCandidate("RAZOR_PAY_KEY_SECRET", (process.env as any).RAZOR_PAY_KEY_SECRET);

    if (secrets_candidates.length === 0) {
      return res.status(500).json({ success: false, error: "Missing Razorpay secret configuration in environment." });
    }

    let matchingSecret: string | null = null;
    let matchingSecretName = "";

    for (const cand of secrets_candidates) {
      const generated_signature = crypto
          .createHmac("sha256", cand.value)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest("hex");

      if (generated_signature === razorpay_signature) {
        matchingSecret = cand.value;
        matchingSecretName = cand.name;
        break;
      }
    }

    if (!matchingSecret) {
      console.log('[RAZORPAY_VERIFY_AUTH] Signature verification check failed against all secret candidates.');
      return res.status(400).json({ success: false, error: "Invalid signature" });
    }

    console.log(`[RAZORPAY] Signature verified successfully using secret source: ${matchingSecretName}`);

    // CAPTURE PAYMENT USING THE MATCHING SECRET
    const razorpay = new Razorpay({ key_id, key_secret: matchingSecret });
    console.log("[RAZORPAY] Capture attempt with amount:", planData?.amount, "using secret source:", matchingSecretName);
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
            console.log("LOG_FIREBASE_CAMPAIGN_UPDATE_RESULT: Campaign updated with ID:", finalCampaignId);
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
            console.log("LOG_FIREBASE_CAMPAIGN_CREATE_RESULT: New campaign created with ID:", campaignRef.id);
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
          paymentId: paymentRef.id,
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
      loadedKeyId: (process.env.RAZOR_PAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "").substring(0, 12) + "...",
      candidateSecretsCount: secrets_candidates.length,
      candidateSecretsSources: secrets_candidates.map(s => s.name)
    });
  }
}
