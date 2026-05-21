import type { VercelRequest, VercelResponse } from '@vercel/node';
import RazorpayConstructor from 'razorpay';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount } = req.body;
  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    return res.status(500).json({ error: 'Razorpay credentials not configured' });
  }

  const Razorpay = (RazorpayConstructor as any).default || RazorpayConstructor;
  const rzp = new Razorpay({ key_id, key_secret });

  try {
    const order = await rzp.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
    });

    res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: key_id
    });
  } catch (error: any) {
    console.error('[RAZORPAY] Create error:', error);
    res.status(500).json({ error: error.message });
  }
}
