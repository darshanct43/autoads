import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbAdm } from '../../backend/_lib/firebase-admin.js';
import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  const state = req.query.state as string;
  const code = req.query.code as string;
  const errorParam = req.query.error as string;

  const renderError = (errMsg: string) => {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Canva Connection Failed</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f9f9fb;
            color: #1e1e24;
          }
          .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            max-width: 480px;
          }
          h2 { color: #ea4335; margin-top: 0; }
          p { color: #5f6368; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Connection Failed</h2>
          <p>${errMsg}</p>
          <p>Please close this window and try again.</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'CANVA_OAUTH_FAILED', error: ${JSON.stringify(errMsg)} }, '*');
          }
        </script>
      </body>
      </html>
    `);
  };

  try {
    if (errorParam) {
      return renderError(`Canva returned error: ${errorParam}`);
    }

    if (!state || !code) {
      return renderError('Missing authorization code or state.');
    }

    // Look up the OAuth state in firestore to verify and retrieve uid + code_verifier
    const stateDocRef = dbAdm.collection('canvaOauthStates').doc(state);
    const stateDoc = await stateDocRef.get();

    if (!stateDoc.exists) {
      return renderError('OAuth state is invalid or has expired.');
    }

    const stateData = stateDoc.data();
    if (!stateData) {
      return renderError('OAuth state record is empty.');
    }

    const { uid, code_verifier } = stateData;

    // Construct the exact redirect_uri used during authorize request
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;
    const redirect_uri = `${baseUrl}/api/canva/callback`;

    // Clean up used state
    await stateDocRef.delete().catch(() => {});

    // Prepare credentials
    const client_id = (process.env.CANVA_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
    const client_secret = (process.env.CANVA_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');

    if (!client_id || !client_secret) {
      return renderError('Server/Canva credentials are not properly configured.');
    }

    const authHeader = 'Basic ' + Buffer.from(`${client_id}:${client_secret}`).toString('base64');

    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirect_uri,
      code_verifier: code_verifier
    });

    console.log('[CANVA OAUTH] Exchanging auth code for access token...', {
      uid,
      redirect_uri,
      client_id: client_id.substring(0, 4) + '...'
    });

    // Request Access Token from Canva Connect API
    const response = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams.toString()
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[CANVA OAUTH] Error exchanging code from Canva:', errText);
      return renderError(`Canva token exchange failed: ${errText || response.statusText}`);
    }

    const data = await response.json();

    // Store in Firestore
    await dbAdm.collection('canvaTokens').doc(uid).set({
      uid,
      access_token: data.access_token,
      refresh_token: data.refresh_token || '',
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000),
      scope: data.scope,
      token_type: data.token_type || 'Bearer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log(`[CANVA OAUTH] Connected successfully for uid=${uid}`);

    // Render HTML response that signals parent window and closes itself
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Canva Connected</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f9f9fb;
            color: #1e1e24;
          }
          .container {
            text-align: center;
            padding: 2.5rem;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.05);
            max-width: 480px;
          }
          .icon {
            width: 64px;
            height: 64px;
            background: #00c4cc;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 1.5rem auto;
          }
          h2 { color: #1e1e24; margin-top: 0; margin-bottom: 0.5rem; }
          p { color: #5f6368; line-height: 1.5; margin-bottom: 1.5rem; }
          .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #00c4cc;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✓</div>
          <h2>Canva Connected Successfully!</h2>
          <p>Your Canva account has been linked to your profile in AutoAds.</p>
          <div class="spinner"></div>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'CANVA_OAUTH_SUCCESS' }, '*');
          }
          setTimeout(function() {
            window.close();
          }, 1500);
        </script>
      </body>
      </html>
    `);
  } catch (err: any) {
    console.error('[CANVA OAUTH] Unhandled exception in callback:', err);
    return renderError(`Unhandled server callback error: ${err.message}`);
  }
}
