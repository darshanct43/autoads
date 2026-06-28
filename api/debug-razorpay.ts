import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getCredential } from "../lib/env.js";
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    RAZORPAY_KEY_ID: getCredential('RAZORPAY_KEY_ID') ? getCredential('RAZORPAY_KEY_ID').substring(0, 8) + "..." : "MISSING",
    RAZORPAY_KEY_SECRET: getCredential('RAZORPAY_KEY_SECRET') ? getCredential('RAZORPAY_KEY_SECRET').substring(0, 3) + "..." : "MISSING",
    RAZOR_PAY_KEY_ID: getCredential('RAZOR_PAY_KEY_ID') ? getCredential('RAZOR_PAY_KEY_ID').substring(0, 8) + "..." : "MISSING",
    RAZOR_PAY_KEY_SECRET: getCredential('RAZOR_PAY_KEY_SECRET') ? getCredential('RAZOR_PAY_KEY_SECRET').substring(0, 3) + "..." : "MISSING",
  });
}
