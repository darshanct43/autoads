import { dbAdm } from '../../lib/firebase-admin.js';
import admin from 'firebase-admin';
import { s3Service } from '../../src/services/s3Service.js'; // Assuming S3 service is available in server context

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { designId } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.replace('Bearer ', '');

    // 1. Check for Duplicate
    const existing = await dbAdm.collection('mediaAssets').where('designId', '==', designId).get();
    if (!existing.empty) return res.json(existing.docs[0].data());

    // 2. Fetch design export from Canva
    const designResponse = await fetch(`https://api.canva.com/rest/v1/designs/${designId}/export`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'png' })
    });
    if (!designResponse.ok) throw new Error('Failed to export design');
    const exportData = await designResponse.json();
    
    // Assume exportData has url to the asset
    const assetUrl = exportData.url; 

    // 2. Download asset
    const assetResponse = await fetch(assetUrl);
    const buffer = Buffer.from(await assetResponse.arrayBuffer());

    // 3. Upload to AWS S3
    const fileName = `canva-imports/${designId}-${Date.now()}.png`;
    const s3Url = await s3Service.uploadFile(fileName, buffer, 'image/png');
    // Store s3Key for cleanup
    const s3Key = fileName;

    // 4. Register in Firestore
    const mediaRef = dbAdm.collection('mediaAssets').doc();
    const mediaData = {
      id: mediaRef.id,
      source: "CANVA",
      designId,
      name: `Canva Import ${designId}`,
      s3Url,
      s3Key,
      thumbnailUrl: s3Url, // Use S3 URL for thumbnail URL
      fileType: 'png',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      importedBy: 'admin' // Should be dynamic
    };
    await mediaRef.set(mediaData);

    res.json(mediaData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
