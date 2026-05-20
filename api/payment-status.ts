import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbAdm } from './_lib/firebase-admin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ success: false, error: "userId is required" });
  }

  try {
    const paymentsSnapshot = await dbAdm.collection('payments')
      .where('customerId', '==', userId)
      .get();
    
    if (paymentsSnapshot.empty) {
      return res.status(200).json({ success: true, paymentStatus: "PENDING", details: "No records found" });
    }
    
    const payments: any[] = paymentsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt ? (data.createdAt as any).toMillis() : 0
      };
    });
    
    payments.sort((a: any, b: any) => b.createdAt - a.createdAt);
    const payment = payments[0];
    
    return res.status(200).json({ 
      success: true,
      paymentStatus: payment.status,
      subscription: (payment.status === 'SUCCESS' || payment.status === 'PAID') ? 'ACTIVE' : 'INACTIVE'
    });
  } catch (e: any) {
    console.error("[SERVER] Status check error:", e);
    return res.status(500).json({ success: false, error: e.message || "Internal Database Error" });
  }
}
