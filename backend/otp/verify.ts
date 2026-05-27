import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) {
    return res.status(400).json({ error: 'PhoneNumber and otp are required' });
  }

  if (otp === '123456' || otp === '1234') {
    res.status(200).json({ success: true, verified: true });
  } else {
    res.status(200).json({ success: true, verified: false, message: 'Invalid OTP' });
  }
}
