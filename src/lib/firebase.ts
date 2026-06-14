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
  memoryLocalCache,
  doc, 
  getDocFromServer, 
  getFirestore,
  Firestore, 
  setLogLevel,
  enableNetwork,
  disableNetwork,
  collection,
  getDocs
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseAppletConfig from '../../firebase-applet-config.json';

setLogLevel('error'); // Suppress verbose warning logs

console.log("[FORENSIC] [Firebase] File loading started");

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey) as string,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain) as string,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId) as string,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket) as string,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId) as string,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId) as string,
};

console.log("[FORENSIC] [Firebase] Config keys resolved. Project ID:", firebaseConfig.projectId);

let app;
try {
  console.log("[FORENSIC] [Firebase] Getting or initializing App instance...");
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  (window as any)._firebaseApp = app;
  console.log("[FORENSIC] [Firebase] App instance initialized successfully");
} catch (appErr) {
  console.error("[FORENSIC] [Firebase] CRITICAL App initialization failed!", appErr);
  throw appErr;
}

const firestoreDbId = (import.meta.env.VITE_FIRESTORE_DATABASE_ID as string || (firebaseAppletConfig as any).firestoreDatabaseId || '(default)');
console.log("[FORENSIC] [Firebase] Database ID resolved as:", firestoreDbId);

let dbInstance: Firestore;
try {
  console.log("[FORENSIC] [Firebase] Initializing Firestore...");
  dbInstance = initializeFirestore(app, {
    localCache: memoryLocalCache()
  }, firestoreDbId === '(default)' ? undefined : firestoreDbId);
  console.log("[FORENSIC] [Firebase] Firestore initialized successfully");
} catch (dbErr) {
  console.error("[FORENSIC] [Firebase] CRITICAL Firestore initialization failed!", dbErr);
  throw dbErr;
}

export const db: Firestore = dbInstance;

// Verify connectivity gracefully
let initialOfflineMode = false;
try {
  if (typeof window !== 'undefined') {
    initialOfflineMode = localStorage.getItem('auto_ads_offline_mode') === 'true';
    console.log("[FORENSIC] [Firebase] Read offline mode flag:", initialOfflineMode);
  }
} catch (e) {
  console.warn("[FORENSIC] [Firebase] localStorage access restricted or blocked in this environment:", e);
}

if (typeof window !== 'undefined' && !initialOfflineMode) {
  console.log("[FORENSIC] [Firebase] Launching async drivers probe...");
  getDocs(collection(db, 'drivers')).then(snap => {
    console.log("[FORENSIC] [Firebase] Async probe succeeded. Drivers count:", snap.size);
  }).catch(err => {
    console.warn("[FORENSIC] [Firebase] Async probe warning (usually expected before login):", (err as any).message || err);
  });
}

// Explicitly initialize Auth with local persistence and popup resolver
let authInstance: Auth;
try {
  console.log("[FORENSIC] [Firebase] Initializing Auth with local persistence...");
  authInstance = initializeAuth(app, {
    persistence: browserLocalPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  console.log("[FORENSIC] [Firebase] Auth initialized with persistence");
} catch (e) {
  console.warn("[FORENSIC] [Firebase] Auth persistence initialization failed, falling back to standard getAuth", e);
  try {
    authInstance = getAuth(app);
    console.log("[FORENSIC] [Firebase] Auth fallback getAuth succeeded");
  } catch (fallbackErr) {
    console.error("[FORENSIC] [Firebase] CRITICAL Auth initialization failed completely!", fallbackErr);
    throw fallbackErr;
  }
}

export const auth = authInstance;
export const storage: FirebaseStorage = getStorage(app);
console.log("[FORENSIC] [Firebase] Module loading completed!");

// Connection verification test with higher resilience
let loginInProgress = false;
let cachedAccessToken: string | null = null;

export const getGoogleAccessToken = () => cachedAccessToken;
export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const googleLogin = async () => {
  if (loginInProgress) {
    throw new Error("An authentication check is already in progress. Please complete the sign-in in the popup window.");
  }
  
  loginInProgress = true;
  const provider = new GoogleAuthProvider();
  // Request Google Workspace Drive scopes
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');
  
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      console.log("[Firebase Auth] Received Google OAuth access token successfully");
    }
    return result;
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
