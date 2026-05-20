import Razorpay from 'razorpay';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const getRazorpay = () => {
    const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) throw new Error("Razorpay credentials missing");
    return new Razorpay({ key_id, key_secret });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    
    const { amount, currency, notes } = req.body;

    try {
        const razorpay = getRazorpay();
        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: currency || "INR",
            notes: notes || {}
        });
        res.json(order);
    } catch (error: any) {
        console.error("create-order error:", error);
        res.status(500).json({ error: error.description || error.message || "Failed to create order" });
    }
}
