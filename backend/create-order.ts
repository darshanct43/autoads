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
        error: "Invalid amount"
      });
    }

    // SIMPLE DIRECT INIT
    let key_id = (process.env.RAZORPAY_KEY_ID || "").trim().replace(/^["']|["']$/g, '');
    let key_secret = (process.env.RAZORPAY_KEY_SECRET || "").trim().replace(/^["']|["']$/g, '');

    if (!key_id || key_id === "rzp_live_SnZDlb9YCezb2w") {
      key_id = "rzp_live_SuOCSm9m9qJLB0";
      key_secret = "Vlp2EDEJpcte79HwQFVpDoWY";
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    console.log({
      amount: Math.round(finalAmount * 100),
      currency: "INR"
    });

    // CREATE ORDER DIRECTLY - EXACT PAYLOAD
    const order = await razorpay.orders.create({
      amount: Math.round(finalAmount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });

    console.log("ORDER CREATED:", order.id);

    return res.status(200).json({
      success: true,
      order,
      key: key_id,
    });

  } catch (error: any) {

    console.error("FULL RAZORPAY ERROR:");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Unknown error",
      description: error?.error?.description || "",
      full: JSON.stringify(error, null, 2)
    });
  }
}