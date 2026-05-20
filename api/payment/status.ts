import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/firebase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    
    try {
        const db = getDb();
        const paymentsSnapshot = await db.collection('payments')
            .where('customerId', '==', userId)
            .get();
        
        if (paymentsSnapshot.empty) {
            return res.json({ success: true, paymentStatus: "PENDING", details: "No records found" });
        }
        
        const payments: any[] = paymentsSnapshot.docs.map(doc => ({
            ...doc.data(),
            createdAt: doc.data().createdAt ? (doc.data().createdAt as any).toMillis() : 0
        }));
        
        payments.sort((a: any, b: any) => b.createdAt - a.createdAt);
        const payment = payments[0];

        return res.status(200).json({ 
            success: true,
            paymentStatus: payment.status || "PENDING",
            subscription: (payment.status === 'SUCCESS' || payment.status === 'PAID') ? 'ACTIVE' : 'INACTIVE'
        });
    } catch (e: any) {
        console.error("status error:", e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
