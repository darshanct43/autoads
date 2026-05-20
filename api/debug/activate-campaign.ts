import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbAdm, admin } from '../_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { campaignId } = req.body;
  if (!campaignId) {
    return res.status(400).json({ error: 'Missing campaignId' });
  }

  try {
    const { FieldValue } = admin.firestore;
    await dbAdm.collection('campaigns').doc(campaignId).set({
      status: 'ACTIVE',
      paymentReceived: true,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    
    res.status(200).json({ success: true, message: "activated" });
  } catch (error: any) {
    console.error("[SERVERLESS] Activation error:", error);
    res.status(500).json({ error: error.message });
  }
}
