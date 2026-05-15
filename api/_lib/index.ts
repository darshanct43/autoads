import Razorpay from 'razorpay';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App;

export function getAdmin() {
  if (!getApps().length) {
    const rawSA = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (rawSA && rawSA.trim()) {
      try {
        let serviceAccount;
        const trimmedSA = rawSA.trim();
        
        if (trimmedSA.startsWith('{')) {
          serviceAccount = JSON.parse(trimmedSA);
        } else {
          // If it's not a JSON string, it might be an malformed string from env
          // Log it specifically for debugging (partial log for security)
          console.error("FIREBASE_SERVICE_ACCOUNT is not a valid JSON. Starts with:", trimmedSA.substring(0, 20));
          throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT format: Expected JSON.");
        }

        // Handle escaped newlines in private_key if it's an object
        if (serviceAccount && typeof serviceAccount === 'object' && serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        adminApp = initializeApp({
          credential: cert(serviceAccount)
        });
        console.log("Firebase Admin initialized with Service Account from ENV");
      } catch (e) {
        console.error("FIREBASE_SERVICE_ACCOUNT parse/init failed, falling back:", e);
        // Fallback to default credentials (works on GCF/Cloud Run)
        try {
          adminApp = initializeApp();
          console.log("Firebase Admin initialized with default credentials");
        } catch (initErr) {
          console.error("Default Firebase Admin init also failed:", initErr);
        }
      }
    } else {
      try {
        adminApp = initializeApp();
        console.log("Firebase Admin initialized with default credentials (no SA env)");
      } catch (initErr) {
        console.error("Default Firebase Admin init failed (no SA env):", initErr);
      }
    }
  }
  return {
    db: getFirestore(),
    auth: getAuth()
  };
}

export function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || process.env.VITE_RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    console.error("[RAZORPAY] Missing credentials on server:", { 
      hasId: !!key_id, 
      hasSecret: !!key_secret,
      env_keys: Object.keys(process.env).filter(k => k.includes('RAZORPAY'))
    });
    return null;
  }

  console.log("[RAZORPAY] Initializing with ID:", key_id.substring(0, 8) + "...");
  return new Razorpay({
    key_id,
    key_secret,
  });
}
