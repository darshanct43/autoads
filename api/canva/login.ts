import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbAdm } from '../../backend/_lib/firebase-admin';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  try {
    const uid = (req.query.uid as string) || "demo-user-uid";

    // Generate random secure state and code verifier
    const state = crypto.randomBytes(24).toString('hex');
    const code_verifier = crypto.randomBytes(32).toString('base64url');
    const code_challenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');

    // Save state to firestore
    await dbAdm.collection('canvaOauthStates').doc(state).set({
      state,
      uid,
      code_verifier,
      createdAt: new Date().toISOString()
    });

    // Create redirect_uri
    const host = req.headers['x-forwarded-host'] || req.headers.host || req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;
    const redirect_uri = `${baseUrl}/api/canva/callback`;

    const client_id = (process.env.CANVA_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');

    const scopes = [
      'canva:design:content:read',
      'canva:design:content:write',
      'canva:asset:private:read',
      'canva:asset:private:write',
      'canva:profile:read'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: client_id,
      redirect_uri: redirect_uri,
      scope: scopes,
      state: state,
      code_challenge: code_challenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `https://www.canva.com/api/oauth/v1/authorize?${params.toString()}`;

    // Redirect the user safely across local express and serverless contexts
    console.log(`[CANVA OAUTH] Initiated auth flow for uid=${uid} state=${state}`);
    
    if (typeof res.redirect === 'function') {
      res.redirect(authUrl);
    } else {
      res.writeHead(302, { Location: authUrl });
      res.end();
    }
  } catch (error: any) {
    console.error('[CANVA OAUTH] Error initiating login flow:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to initiate login flow: ' + error.message });
  }
}
