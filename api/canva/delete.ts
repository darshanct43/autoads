import { s3Service } from '../../src/services/s3Service.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { id } = req.body;
    
    // Read meta data from S3
    const buffer = await s3Service.getFile(`canva/mediaAssets/${id}.json`);
    const data = JSON.parse(buffer.toString());
    
    if (data?.s3Key) {
        await s3Service.deleteFile(data.s3Key);
    }
    
    await s3Service.deleteFile(`canva/mediaAssets/${id}.json`);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Asset not found or error deleting' });
  }
}
