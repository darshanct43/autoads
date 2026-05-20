import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbAdm, admin } from '../_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { FieldValue } = admin.firestore;
    
    // Create Demo Campaign
    const campaignData = {
        title: "Demo AutoAds Campaign",
        status: "ACTIVE",
        mediaUrl: "https://d3v3y4z5a6b7c8.cloudfront.net/demo-ad-1.mp4",
        mediaType: "VIDEO",
        durationDays: 30,
        hoursPerDay: 8,
        maxAutos: 10,
        createdAt: FieldValue.serverTimestamp(),
    };
    
    const campaignRef = await dbAdm.collection('campaigns').add(campaignData);
    
    // Create Demo Terminal
    await dbAdm.collection('terminals').doc("TRM-DEMO001").set({
        id: "TRM-DEMO001",
        status: "ACTIVE",
        createdAt: FieldValue.serverTimestamp()
    });

    res.status(200).json({ status: "success", campaignId: campaignRef.id });
  } catch (error: any) {
    console.error("[SERVERLESS] Demo setup error:", error);
    res.status(500).json({ error: error.message });
  }
}
