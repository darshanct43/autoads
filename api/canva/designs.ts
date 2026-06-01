import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbAdm } from '../../lib/firebase-admin.js';

export default async function handler(req: any, res: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    // In this simplified architecture, we are getting the bearer token 
    // from the client, which is then used to authenticate against Canva API.
    // Ideally, the backend should exchange a session and use a stored token.
    const token = authHeader.replace('Bearer ', '');
    
    const response = await fetch('https://api.canva.com/rest/v1/designs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        const error = await response.json();
        return res.status(response.status).json(error);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
