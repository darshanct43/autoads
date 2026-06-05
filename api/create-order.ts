import type { VercelRequest, VercelResponse } from "@vercel/node";
import Razorpay from "razorpay";

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

  try {
    const { amount } = req.body;

    console.log("RAW AMOUNT:", amount);
    console.log("TYPE:", typeof amount);

    const finalAmount = Number(amount);

    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    key_id = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID || '').trim().replace(/^["']|["']$/g, '');
    key_secret = (process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || '').trim().replace(/^["']|["']$/g, '');

    if (!key_id || !key_secret) {
      return res.status(500).json({
        success: false,
        error: 'Missing Razorpay credentials in environment',
      });
    }

    const razorpay = new Razorpay({ key_id, key_secret });

    const order = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100),
      currency: 'INR',
      receipt: 'receipt_' + Date.now(),
    });

    return res.status(200).json({
      success: true,
      order,
      key: key_id,
    });


  } catch (error: any) {
    const description = error?.error?.description || "";
    
    console.error("FULL RAZORPAY ERROR:");
    console.error(JSON.stringify(error, null, 2));

    const isAuthError = description.toLowerCase().includes("authentication") || 
                        error?.message?.toLowerCase().includes("authentication") || 
                        error?.statusCode === 401;

    const userFriendlyMessage = isAuthError
      ? `Razorpay Keys Invalid (Loaded ID: ${key_id ? key_id.substring(0, 12) + "..." : "none"}). Please verify your credentials in your .env file and restart the server.`
      : (error?.message || "Unknown error");

    return res.status(500).json({
      success: false,
      message: userFriendlyMessage,
      description: description || userFriendlyMessage,
      full: String(error),
      code: error.code,
      statusCode: error.statusCode,
      loadedKeyId: key_id ? key_id.substring(0, 12) + "..." : "none",
      loadedSecretPrefix: key_secret ? key_secret.substring(0, 4) + "..." : "none",
      loadedSecretLen: key_secret ? key_secret.length : 0,
    });
  }
}