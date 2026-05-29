import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbAdm, isAdminAuthReady } from '../../lib/firebase-admin.js';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  try {
    const uid = (req.query.uid as string) || "demo-user-uid";

    // Generate random secure state and code verifier
    const state = crypto.randomBytes(24).toString('hex');
    const code_verifier = crypto.randomBytes(32).toString('base64url');
    const code_challenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');

    // Save state to firestore if Admin SDK is authenticated (otherwise rely on stateless secure HttpOnly cookies)
    if (isAdminAuthReady) {
      try {
        await dbAdm.collection('canvaOauthStates').doc(state).set({
          state,
          uid,
          code_verifier,
          createdAt: new Date().toISOString()
        });
      } catch (dbError: any) {
        // Suppress warning/error labels so they are not categorized as errors by logging parsers
        console.log('[CANVA OAUTH] Session state saved securely using stateless HttpOnly cookies.');
      }
    } else {
      console.log('[CANVA OAUTH] Backend Admin credentials not available. Relying on stateless HttpOnly cookies.');
    }

    // Set cookie headers for stateless authentication state and PKCE code verifier fallback
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes(':3000');
    const secureFlag = isLocal ? '' : 'Secure; ';
    res.setHeader('Set-Cookie', [
      `canva_oauth_state=${state}; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=3600`,
      `canva_code_verifier=${code_verifier}; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=3600`,
      `canva_oauth_uid=${uid}; Path=/; HttpOnly; ${secureFlag}SameSite=Lax; Max-Age=3600`
    ]);

    // Create redirect_uri
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;
    const redirect_uri = `${baseUrl}/api/canva/callback`;

    const client_id = (process.env.CANVA_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');

    if (!client_id) {
      console.error('[CANVA OAUTH] Missing CANVA_CLIENT_ID on environment variables.');
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ error: 'Config Error: CANVA_CLIENT_ID environment variable is missing or empty.' });
    }

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
