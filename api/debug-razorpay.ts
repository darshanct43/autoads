import type { VercelRequest, VercelResponse } from "@vercel/node";
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.substring(0, 8) + "..." : "MISSING",
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.substring(0, 3) + "..." : "MISSING",
    RAZOR_PAY_KEY_ID: process.env.RAZOR_PAY_KEY_ID ? process.env.RAZOR_PAY_KEY_ID.substring(0, 8) + "..." : "MISSING",
    RAZOR_PAY_KEY_SECRET: process.env.RAZOR_PAY_KEY_SECRET ? process.env.RAZOR_PAY_KEY_SECRET.substring(0, 3) + "..." : "MISSING",
  });
}
