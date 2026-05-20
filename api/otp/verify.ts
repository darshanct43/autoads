import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP are required' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    return res.status(500).json({ error: 'Twilio credentials not configured' });
  }

  const client = twilio(accountSid, authToken);

  try {
    const verificationCheck = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: `+91${phoneNumber}`, code: otp });

    if (verificationCheck.status === 'approved') {
      res.status(200).json({ success: true, status: 'approved' });
    } else {
      res.status(400).json({ success: false, status: verificationCheck.status });
    }
  } catch (error: any) {
    console.error('[TWILIO] OTP Verify error:', error);
    res.status(500).json({ error: error.message });
  }
}
