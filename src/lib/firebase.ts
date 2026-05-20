import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth,
  browserLocalPersistence, 
  browserPopupRedirectResolver, 
  GoogleAuthProvider, 
  signInWithPopup,
  Auth
} from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

console.log("Firebase ENV Check:", firebaseConfig);

Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    console.error("Missing Firebase ENV:", key);
  }
});

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
(window as any)._firebaseApp = app;

const firestoreDbId = (import.meta.env.VITE_FIRESTORE_DATABASE_ID as string || '(default)');

// Use memoryLocalCache for Firestore to avoid persistence issues in iframes
export const db: Firestore = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
}, firestoreDbId === '(default)' ? undefined : firestoreDbId);

// Explicitly initialize Auth with local persistence and popup resolver
// This helps resolve "Pending promise was never set" assertion errors in v11 SDK
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: browserLocalPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch (e) {
  // If already initialized, use getAuth
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const storage: FirebaseStorage = getStorage(app);

// Connection verification test with higher resilience
async function testConnection() {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
  try {
    console.log("[Firebase] Probing Cloud Firestore...");
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connectivity')),
      timeout
    ]);
    console.log("[Firebase] Cloud Link Established.");
  } catch (error: any) {
    if (error.message === 'timeout') {
      console.warn("[Firebase] Backend latency detected.");
    } else {
      console.log("[Firebase] System initialized (Network standby).");
    }
  }
}
testConnection();

export const googleLogin = async () => {
  const provider = new GoogleAuthProvider();
  // Ensure we are using the popup resolver correctly
  try {
    return await signInWithPopup(auth, provider);
  } catch (error: any) {
    console.error("[Firebase Auth Error]", error);
    if (error.code === 'auth/network-request-failed') {
      throw new Error("Authentication failed due to a network error. Please ensure you are not blocking popups or third-party cookies, and that your domain is authorized in Firebase Console.");
    }
    if (error.code === 'auth/operation-not-allowed') {
       throw new Error("Google Sign-in is not enabled in your Firebase Console. Please enable it in Authentication > Sign-in method.");
    }
    if (error.code === 'auth/unauthorized-domain') {
       throw new Error("This domain is not authorized for Google Login. Please add the current preview URL to the authorized domains in your Firebase Console and ensure that your email has a verified AutoAds account.");
    }
    throw error;
  }
};

export default app;
