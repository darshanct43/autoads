import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dbAdm, isAdminAuthReady } from '../../lib/firebase-admin.js';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
  return cookies;
}

export default async function handler(req: any, res: any) {
  const state = req.query.state as string;
  const code = req.query.code as string;
  const errorParam = req.query.error as string;

  console.log('[CANVA OAUTH] Callback triggered:', { code: !!code, state, error: errorParam });

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
    
    // Extract uid from state, in format randomPart:uid
    const [randomPart, uid] = state.split(':');
    if (!uid) {
        return renderError('Invalid state format: missing uid.');
    }

    // Look up cookie values first for stateless OAuth session verification
    const cookies = parseCookies(req.headers.cookie);
    console.log('[CANVA OAUTH] Cookies in callback:', cookies);
    const cookieState = cookies['canva_oauth_state'] ? decodeURIComponent(cookies['canva_oauth_state']) : undefined;
    const cookieCodeVerifier = cookies['canva_code_verifier'];

    let code_verifier = cookieCodeVerifier || '';
    let stateVerified = false;

    console.log('[CANVA OAUTH] Validation Debug:', { 
      hasCookieState: !!cookieState, 
      queryState: state,
      cookieState: cookieState,
      cookiesMatch: cookieState === state,
      hasCodeVerifier: !!code_verifier
    });

    if (cookieState && cookieState === state) {
      console.log('[CANVA OAUTH] Statelessly verified OAuth state via cookies.');
      stateVerified = true;
    }

    if (!stateVerified || !uid || !code_verifier) {
      console.error('[CANVA OAUTH] Validation critical failure:', { 
        stateVerified, 
        uid: uid ? 'PRESENT' : 'MISSING', 
        code_verifier: code_verifier ? 'PRESENT' : 'MISSING',
        state,
        cookieState: cookieState
      });
      return renderError('OAuth state validation failed: state mismatch or missing parameters.');
    }

    // Construct the exact redirect_uri used during authorize request
    const redirect_uri =
      process.env.CANVA_REDIRECT_URI ||
      "https://autoads-nine.vercel.app/api/canva/callback";
    console.log('[CANVA OAUTH] Redirect target:', redirect_uri);
    
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

    console.log('[CANVA OAUTH] Exchanging auth code for access token...');

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
    console.log('[CANVA OAUTH] Token exchange successful');

    // Store in Firestore gracefully if Admin SDK is authenticated
    if (isAdminAuthReady) {
      try {
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
        console.log(`[CANVA OAUTH] Backend Admin SDK successfully stored token for uid=${uid}`);
      } catch (dbError: any) {
        console.error('[CANVA OAUTH] Failed to store token in Firestore:', dbError);
      }
    }

    // Clear authentication state cookies
    const url = new URL(redirect_uri);
    const isLocal = url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1') || url.port === '3000';
    const secureFlag = isLocal ? '' : 'Secure; ';
    const sameSite = isLocal ? 'Lax' : 'None';
    res.setHeader('Set-Cookie', [
      `canva_oauth_state=; Path=/; HttpOnly; ${secureFlag}SameSite=${sameSite}; Max-Age=0`,
      `canva_code_verifier=; Path=/; HttpOnly; ${secureFlag}SameSite=${sameSite}; Max-Age=0`
    ]);

    // Render HTML response that signals parent window (passing tokenData) and closes itself
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✓</div>
          <h2>Canva Connected Successfully!</h2>
          <p>Your Canva account has been linked to your profile in AutoAds.</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'CANVA_OAUTH_SUCCESS', 
              tokenData: ${JSON.stringify(data)} 
            }, '*');
            // Safely close the window
            window.open('', '_self').close();
          } else {
            window.location.href = '/';
          }
        </script>
      </body>
      </html>
    `);
  } catch (err: any) {
    console.error('[CANVA OAUTH] Unhandled exception in callback:', err);
    return renderError(`Unhandled server callback error: ${err.message}`);
  }
}
