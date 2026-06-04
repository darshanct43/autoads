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

  try {
    const { amount } = req.body;

    console.log("RAW AMOUNT:", amount);
    console.log("TYPE:", typeof amount);

    const finalAmount = Number(amount);

    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount",
      });
    }

    // ENV VARIABLES
    const key_id_raw = process.env.RAZOR_PAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const key_secret_raw = process.env.RAZORPAY_KEY_SECRET;

    console.log("RAZORPAY_KEY_ID exists:", !!key_id_raw);
    console.log("RAZORPAY_KEY_SECRET exists:", !!key_secret_raw);

    const key_id = key_id_raw?.trim()?.replace(/^["']|["']$/g, '');
    const key_secret = key_secret_raw?.trim()?.replace(/^["']|["']$/g, '');

    if (!key_id || !key_secret) {
      return res.status(500).json({
        success: false,
        error: "Missing Razorpay credentials",
      });
    }

    // RAZORPAY INIT
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    console.log({
      amount: Math.round(finalAmount * 100),
      currency: "INR",
    });

    // CREATE ORDER
    const order = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    console.log("ORDER CREATED:", order.id);

    return res.status(200).json({
      success: true,
      order,
      key: key_id,
    });

  } catch (error: any) {
    const description = error?.error?.description || "";
    
    console.error("FULL RAZORPAY ERROR:");
    console.error(JSON.stringify(error, null, 2));

    return res.status(500).json({
      success: false,
      message: error?.message || "Unknown error",
      description: description,
      full: String(error),
      code: error.code,
      statusCode: error.statusCode,
    });
  }
}