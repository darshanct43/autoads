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
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc, 
  getDocFromServer, 
  getFirestore,
  Firestore, 
  setLogLevel,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

setLogLevel('error'); // Suppress verbose warning logs
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
(window as any)._firebaseApp = app;

const firestoreDbId = (import.meta.env.VITE_FIRESTORE_DATABASE_ID as string || '(default)');

let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  }, firestoreDbId === '(default)' ? undefined : firestoreDbId);
} catch (e) {
  dbInstance = getFirestore(app, firestoreDbId === '(default)' ? undefined : firestoreDbId);
}

export const db: Firestore = dbInstance;
console.log("[Firebase] Firestore initialized. Database ID:", firestoreDbId);

// Explicitly initialize Auth with local persistence and popup resolver
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: browserLocalPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch (e) {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const storage: FirebaseStorage = getStorage(app);

// Connection verification test with higher resilience
async function testConnection(retries = 3) {
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
    console.log("[Firebase] Probing Cloud Firestore...");
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connectivity')),
      timeout
    ]);
    console.log("[Firebase] Cloud Link Established.");
  } catch (error: any) {
    if (error.message === 'timeout' && retries > 0) {
      console.warn(`[Firebase] Backend latency detected. Retrying... (${retries} attempts left)`);
      setTimeout(() => {
        testConnection(retries - 1);
      }, 1000);
    } else {
      console.log("[Firebase] System initialized (Network standby or offline mode).");
    }
  }
}
testConnection();

let loginInProgress = false;

export const googleLogin = async () => {
  if (loginInProgress) {
    throw new Error("An authentication check is already in progress. Please complete the sign-in in the popup window.");
  }
  
  loginInProgress = true;
  const provider = new GoogleAuthProvider();
  
  try {
    return await signInWithPopup(auth, provider);
  } catch (error: any) {
    console.error("[Firebase Auth Error]", error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("The sign-in window was closed before completion. Please try again when ready.");
    }
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error("The sign-in process was cancelled. Please try again.");
    }
    if (error.code === 'auth/network-request-failed') {
      throw new Error("User sign-in did not complete due to a network error. Please ensure you are not blocking popups or third-party cookies, and that your domain is authorized in Firebase Console.");
    }
    if (error.code === 'auth/operation-not-allowed') {
       throw new Error("Google Sign-in is not enabled in your Firebase Console. Please enable it in Authentication > Sign-in method.");
    }
    if (error.code === 'auth/unauthorized-domain') {
       throw new Error("This domain is not authorized for Google Login. Please add the current preview URL to the authorized domains in your Firebase Console.");
    }
    throw error;
  } finally {
    loginInProgress = false;
  }
};

export default app;
