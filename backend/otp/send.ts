import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'phone number is required' });
  }

  console.log(`[OTP] Sending mock OTP code "123456" to phone number: ${phoneNumber}`);
  res.status(200).json({ success: true, message: 'OTP sent successfully (mock mode)' });
}
