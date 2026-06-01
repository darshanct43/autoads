import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// In production, this would be an API call to a backend service that
// securely handles the Canva OAuth credentials.
// For now, following the pattern of accessing token data from firestore.

export const canvaService = {
  async getCanvaToken(uid: string) {
    const tokenDoc = await getDoc(doc(db, 'canvaTokens', uid));
    if (!tokenDoc.exists()) throw new Error('Canva not connected');
    return tokenDoc.data();
  },

  async listDesigns(token: string) {
    // Call Canva API (via proxy endpoint) to list designs
    const response = await fetch('/api/canva/designs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to list designs');
    return response.json();
  },

  async getDesign(token: string, designId: string) {
    const response = await fetch(`/api/canva/designs/${designId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to get design');
    return response.json();
  },

  async importToAutoAds(token: string, designId: string) {
    const response = await fetch('/api/canva/import', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ designId })
    });
    if (!response.ok) throw new Error('Failed to import design');
    return response.json();
  }
};
