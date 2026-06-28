import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import { getCredential } from '../lib/env.js';

export default async function handler(req: Request, res: Response) {
  const key_id = getCredential('RAZORPAY_KEY_ID').trim();
  const secret = getCredential('RAZORPAY_KEY_SECRET').trim();

  const diagnostics: any = {
    RUNTIME_KEY_PREFIX: key_id.substring(0, 12),
    RUNTIME_KEY_SUFFIX: key_id.substring(Math.max(0, key_id.length - 6)),
    SECRET_LENGTH: secret.length,
    AUTH_SUCCESS: false,
    ORDER_CREATED: false,
    ORDER_ID: null,
    ERROR_CODE: null,
    ERROR_DESCRIPTION: null
  };

  try {
    const razorpay = new Razorpay({ key_id, key_secret: secret });
    diagnostics.AUTH_SUCCESS = true;
    
    const order = await razorpay.orders.create({
      amount: 100,
      currency: "INR",
      receipt: "audit_test"
    });
    
    diagnostics.ORDER_CREATED = true;
    diagnostics.ORDER_ID = order.id;
  } catch (error: any) {
    diagnostics.ERROR_CODE = error?.error?.code || error?.code || 'UNKNOWN';
    diagnostics.ERROR_DESCRIPTION = error?.error?.description || error?.description || error?.message || 'UNKNOWN';
    diagnostics.FULL_ERROR = error;
  }

  res.status(200).json(diagnostics);
}
