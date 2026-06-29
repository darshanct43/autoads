import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { getCredential } from './env.js';

let adminApp;

let appletConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    appletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  // ignore
}

const firebaseProjectId = getCredential('GOOGLE_CLOUD_PROJECT') || getCredential('FIREBASE_PROJECT_ID') || process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || appletConfig.projectId;
const firebaseDatabaseId = appletConfig.firestoreDatabaseId || getCredential('FIRESTORE_DATABASE_ID') || process.env.FIRESTORE_DATABASE_ID || '(default)';

let rawSA = getCredential('FIREBASE_SERVICE_ACCOUNT') || process.env.FIREBASE_SERVICE_ACCOUNT;

if (rawSA && rawSA.trim().includes('mayaan_webhook_secure_2026')) {
  console.warn('[FIREBASE_DIAGNOSTICS] CRITICAL CONFIGURATION ISSUE: The environment variable "FIREBASE_SERVICE_ACCOUNT" is incorrectly set to the Razorpay webhook secret string ("mayaan_webhook_secure_2026") instead of a valid Firebase Service Account JSON key. This causes Firebase Admin initialization to fail/fallback.');
}

let serviceAccount = parseServiceAccount(rawSA);

if (!serviceAccount) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      let saJsonLines: string[] = [];
      let insideSA = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('FIREBASE_SERVICE_ACCOUNT=')) {
          insideSA = true;
          const val = line.substring(line.indexOf('=') + 1).trim();
          saJsonLines.push(val);
          if (val.endsWith('}')) break;
          continue;
        }
        if (insideSA) {
          saJsonLines.push(line);
          if (trimmed === '}') {
            break;
          }
        }
      }
      if (saJsonLines.length > 0) {
        const rawJson = saJsonLines.join('\n');
        serviceAccount = JSON.parse(rawJson);
        console.log('[FIREBASE] Admin SDK parsed service account via multi-line .env fallback reader.');
      }
    }
  } catch (e: any) {
    console.warn('[FIREBASE] Fallback multi-line .env service account parsing failed:', e.message);
  }
}

if (!serviceAccount) {
  try {
    const saPath = path.resolve(process.cwd(), 'firebase-service-account.json');
    if (fs.existsSync(saPath)) {
      rawSA = fs.readFileSync(saPath, 'utf8');
      serviceAccount = parseServiceAccount(rawSA);
      console.log('[FIREBASE] Admin SDK loaded service account from file.');
    }
  } catch (e) {
    console.error("[FIREBASE] Could not load service account from disk:", e);
  }
}
console.log('[FIREBASE] Admin SDK loading variables:', { firebaseProjectId, firebaseDatabaseId, hasSA: !!serviceAccount });
const appOptions: any = {
  projectId: firebaseProjectId
};

function parseServiceAccount(raw: string | undefined): any {
  if (!raw || !raw.trim()) return null;
  const clean = raw.trim();
  
  // Try 1: Direct JSON parsing
  try {
    return JSON.parse(clean);
  } catch (e) {
    // Check for common truncation symbols if dotenv failed to read multi-line
    if (clean === '{' || clean === '"{' || clean === "'{") {
      console.warn('[FIREBASE] FIREBASE_SERVICE_ACCOUNT appears truncated in environment. Check for missing quotes.');
      return null;
    }

    // Try 2: Strip outer quotes if any and parse
    try {
      const dequoted = clean.replace(/^["']|["']$/g, '').trim();
      return JSON.parse(dequoted);
    } catch (e2) {
      // Try 3: Try Base64 decoding
      try {
        const decoded = Buffer.from(clean, 'base64').toString('utf8');
        if (decoded.trim().startsWith('{')) {
          return JSON.parse(decoded);
        }
      } catch (e3) {
        // ignore
      }
      
      // Try 4: Try base64 decoding with dequoted string
      try {
        const dequoted = clean.replace(/^["']|["']$/g, '').trim();
        const decoded = Buffer.from(dequoted, 'base64').toString('utf8');
        if (decoded.trim().startsWith('{')) {
          return JSON.parse(decoded);
        }
      } catch (e4) {
        // ignore
      }
    }
  }
  
  console.warn(`[FIREBASE] FIREBASE_SERVICE_ACCOUNT is configured but cannot be parsed as JSON. Starts with: "${clean.substring(0, 40)}..."`);
  return null;
}

const isAdminAuthReady = !!(serviceAccount && serviceAccount.private_key);

if (!getApps().length) {
  if (serviceAccount) {
    try {
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      appOptions.credential = cert(serviceAccount);
    } catch (certError: any) {
      console.error("[FIREBASE] Error setting certificate credentials:", certError);
    }
  }
  
  try {
    adminApp = initializeApp(appOptions);
  } catch (initError: any) {
    console.error("[FIREBASE] Critical App initialization failed:", initError);
  }
} else {
  adminApp = getApps()[0];
}

let dbAdm: any;
try {
  if (adminApp) {
    dbAdm = getFirestore(adminApp, firebaseDatabaseId);
  } else {
    throw new Error("No active Firebase Admin App found.");
  }
} catch (dbError: any) {
  console.error("[FIREBASE] Firestore instance generation failed:", dbError);
  dbAdm = new Proxy({}, {
    get(target, prop) {
      return (...args: any[]) => {
        throw new Error(`Firebase Admin SDK was not initialized correctly. Cannot access dbAdm.${String(prop)}. Reason: ${dbError.message}`);
      };
    }
  });
}

export { dbAdm };
export { admin };
export { isAdminAuthReady };
