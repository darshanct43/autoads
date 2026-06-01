import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { dbAdm, isAdminAuthReady } from '../../lib/firebase-admin.js';

export default async function handler(req: any, res: any) {
  try {
    const uid = (req.query.uid as string);
    if (!uid) {
        console.error('[CANVA OAUTH] Missing uid query parameter.');
        return res.status(400).json({ error: 'Missing uid query parameter.' });
    }

    // Generate random secure state and code verifier for PKCE, including uid in state
    const randomPart = crypto.randomBytes(24).toString('hex');
    const state = `${randomPart}:${uid}`;
    const code_verifier = crypto.randomBytes(32).toString('base64url');
    const code_challenge = crypto.createHash('sha256').update(code_verifier).digest('base64url');

    // Store auth state in Firestore reliably
    if (isAdminAuthReady) {
        console.log('[CANVA OAUTH] Storing auth state in Firestore with doc ID:', state);
        try {
            await dbAdm.collection('canvaPendingAuth').doc(state).set({
                code_verifier,
                expiresAt: Date.now() + 3600000
            });
            console.log('[CANVA OAUTH] Successfully stored auth state in Firestore');

            const verifyDoc = await dbAdm.collection('canvaPendingAuth').doc(state).get();
            console.error('[CANVA WRITE VERIFY]', {
                state,
                exists: verifyDoc.exists
            });
        } catch (e) {
            console.error('[CANVA OAUTH] Error storing auth state in Firestore:', e);
            console.error('[CANVA WRITE ERROR]', e);
        }
    }

    // Always set cookie headers for fallback
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes(':3000');
    const secureFlag = isLocal ? '' : 'Secure; ';
    const sameSite = isLocal ? 'Lax' : 'None';
    res.setHeader('Set-Cookie', [
      `canva_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; ${secureFlag}SameSite=${sameSite}; Max-Age=3600`,
      `canva_code_verifier=${code_verifier}; Path=/; HttpOnly; ${secureFlag}SameSite=${sameSite}; Max-Age=3600`
    ]);

    // Create redirect_uri
    const redirect_uri =
      process.env.CANVA_REDIRECT_URI ||
      "https://autoads-nine.vercel.app/api/canva/callback";

    const client_id = (process.env.CANVA_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');

    if (!client_id) {
      console.error('[CANVA OAUTH] Missing CANVA_CLIENT_ID on environment variables.');
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ error: 'Config Error: CANVA_CLIENT_ID environment variable is missing or empty.' });
    }

    const scopes = [
      'design:content:read'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: client_id,
      redirect_uri: redirect_uri,
      scope: scopes,
      state: state, // Needed to facilitate callback state validation
      code_challenge: code_challenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `https://www.canva.com/api/oauth/authorize?${params.toString()}`;

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
