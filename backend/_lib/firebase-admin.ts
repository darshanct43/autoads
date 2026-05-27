import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

let adminApp;

const firebaseProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
const firebaseDatabaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
const rawSA = process.env.FIREBASE_SERVICE_ACCOUNT;
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

if (!getApps().length) {
  const serviceAccount = parseServiceAccount(rawSA);
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
  
  adminApp = initializeApp(appOptions);
} else {
  adminApp = getApps()[0];
}

export const dbAdm = getFirestore(adminApp, firebaseDatabaseId);
export { admin };
