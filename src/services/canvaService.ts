import { s3Service } from './s3Service';

export const canvaService = {
  async getCanvaToken(uid: string) {
    try {
      const tokenBuffer = await s3Service.getFile(`canva/tokens/${uid}.json`);
      return JSON.parse(tokenBuffer.toString());
    } catch (e) {
      throw new Error('Canva not connected');
    }
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
