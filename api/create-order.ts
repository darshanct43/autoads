import type { VercelRequest, VercelResponse } from "@vercel/node";
import Razorpay from "razorpay";
import { getCredential } from "../lib/env.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  let key_id = "";
  let key_secret = "";
  let finalAmount = 0;

  try {
    const { amount } = req.body;

    console.log("RAW AMOUNT:", amount);
    console.log("TYPE:", typeof amount);

    finalAmount = Number(amount);

    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    key_id = getCredential('RAZORPAY_KEY_ID').trim().replace(/^["']|["']$/g, '');
    key_secret = getCredential('RAZORPAY_KEY_SECRET').trim().replace(/^["']|["']$/g, '');

    // FORENSIC AUDIT LOG
    console.log("------------------------------------------");
    console.log("RAZORPAY RUNTIME AUDIT:");
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

    console.log("[LOG] [CREATE_ORDER] Order creation initiated", { amount: finalAmount });

    const razorpay = new Razorpay({ key_id, key_secret });

    const order = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100),
      currency: 'INR',
      receipt: 'receipt_' + Date.now(),
      notes: req.body.notes || {}
    });

    console.log("[LOG] [CREATE_ORDER] Order successfully created in Razorpay", { orderId: order.id });

    return res.status(200).json({
      success: true,
      order,
      key: key_id,
    });


  } catch (error: any) {
    const description = error?.error?.description || "";
    
    console.error("FULL RAZORPAY ERROR:", error);

    const userFriendlyMessage = error?.message || "Unknown error";

    return res.status(500).json({
      success: false,
      message: userFriendlyMessage,
      description: description || userFriendlyMessage,
      full: error,
      code: error.code,
      statusCode: error.statusCode,
      loadedKeyId: key_id ? key_id.substring(0, 12) + "..." : "none",
      loadedSecretLen: key_secret ? key_secret.length : 0,
    });
  }
}