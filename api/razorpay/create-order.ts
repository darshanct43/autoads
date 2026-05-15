import { VercelRequest, VercelResponse } from '@vercel/node';
import { getRazorpay } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, currency, notes } = req.body;

  try {
    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(500).json({ error: "Razorpay credentials not configured in backend." });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // convert to paise
      currency: currency || "INR",
      notes: notes || {}
    }).catch(err => {
      console.error("[SERVERLESS RAZORPAY ERROR]", err);
      throw err;
    });

    return res.status(200).json(order);
  } catch (error: any) {
    console.error("[PAYMENT] Order Creation Failed:", error.description || error.message);
    return res.status(500).json({ error: error.description || error.message || "Order creation failed" });
  }
}
