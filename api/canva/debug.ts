import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;
    const redirect_uri = `${baseUrl}/api/canva/callback`;
    const client_id = (process.env.CANVA_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
    
    // The scopes currently used in login.ts
    const scopes = ['profile:read'].join(' ');

    const state = 'debug_state_val';
    const code_verifier = 'debug_code_verifier_val';
    const code_challenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: client_id,
      redirect_uri: redirect_uri,
      scope: scopes,
      state: state,
      code_challenge: code_challenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `https://www.canva.com/api/oauth/authorize?${params.toString()}`;

    res.setHeader('Content-Type', 'application/json');
    res.json({
        client_id: client_id,
        redirect_uri: redirect_uri,
        scope_string: scopes,
        authorization_url: authUrl
    });

  } catch (error: any) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to generate debug info: ' + error.message });
  }
}
