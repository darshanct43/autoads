import type { VercelRequest, VercelResponse } from "@vercel/node";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.VITE_RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { amount, currency, notes } = req.body;

    // Validation
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: "Amount is required",
      });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Number(amount) * 100,
      currency: currency || "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: notes || {},
    });

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error("RAZORPAY ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Order creation failed",
    });
  }
}