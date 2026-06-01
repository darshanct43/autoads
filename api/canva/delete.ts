import { dbAdm } from '../../lib/firebase-admin.js';
import { s3Service } from '../../src/services/s3Service.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { id } = req.body;
    const mediaRef = dbAdm.collection('mediaAssets').doc(id);
    const mediaDoc = await mediaRef.get();
    
    if (!mediaDoc.exists) return res.status(404).json({ error: 'Asset not found' });
    
    const data = mediaDoc.data();
    if (data?.s3Key) {
        await s3Service.deleteFile(data.s3Key);
    }
    
    await mediaRef.delete();
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
