import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth,
  browserLocalPersistence, 
  GoogleAuthProvider, 
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
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
import firebaseAppletConfig from '../../../../firebase-applet-config.json';

setLogLevel('error'); // Suppress verbose warning logs

// Global navigation trackers & URL logging
if (typeof window !== 'undefined') {
  console.log("[TRACE] [Navigation Tracker] Binding window event listeners...");
  window.addEventListener("beforeunload", function() {
    console.log("[TRACE] beforeunload", window.location.href);
  });

  window.addEventListener("pagehide", function() {
    console.log("[TRACE] pagehide", window.location.href);
  });

  if (!(window as any)._traceUrlIntervalBound) {
    (window as any)._traceUrlIntervalBound = true;
    setInterval(() => {
      console.log("[TRACE URL]", window.location.href);
    }, 1000);
    console.log("[TRACE] 1-second URL trace interval registered.");
  }
}

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
  console.log("[TRACE 1] Before initializeApp");
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  console.log("[TRACE 2] After initializeApp");
  (window as any)._firebaseApp = app;
} catch (appErr) {
  console.error("[FORENSIC] [Firebase] CRITICAL App initialization failed!", appErr);
  throw appErr;
}

const firestoreDbId = (import.meta.env.VITE_FIRESTORE_DATABASE_ID as string || (firebaseAppletConfig as any).firestoreDatabaseId || 'ai-studio-autoadsdriverfle-2d7c0ec8-7f5b-426d-8e1a-dc77926ec5fb');
console.log("[FORENSIC] [Firebase] Database ID resolved as:", firestoreDbId);

let dbInstance: Firestore;
try {
  console.log("[TRACE 2.1] Before initializeFirestore");
  dbInstance = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    ignoreUndefinedProperties: true
  }, firestoreDbId === '(default)' ? undefined : firestoreDbId);
  console.log("[TRACE 2.2] After initializeFirestore");
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
  console.log("[FORENSIC] [Firebase] Deferred eager probe to avoid unauthenticated network connection warnings on boot.");
}

// Explicitly initialize Auth with standard Firebase Auth instance
let authInstance: Auth | null = null;

try {
  console.log("[TRACE 3] Initializing standard Firebase Auth client...");
  authInstance = getAuth(app);
  console.log("[TRACE 4] After getAuth. standard authInstance successfully retrieved.");
} catch (e) {
  console.error("[FORENSIC] [Firebase] Real Auth initialization failed, using secure fallback", e);
  authInstance = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
  } as any;
}

export const auth = authInstance as Auth;
export const storage: FirebaseStorage = getStorage(app);
console.log("[FORENSIC] [Firebase] Module loading completed!");

// Connection verification test with higher resilience
let loginInProgress = false;
let cachedAccessToken: string | null = null;

export const getGoogleAccessToken = () => cachedAccessToken;
export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const handleRedirectResult = async () => {
  try {
    console.log("[FORENSIC] [Firebase] Running getRedirectResult checking redirect...");
    const result = await getRedirectResult(auth);
    if (result) {
      console.log("[FORENSIC] [Firebase] Successfully processed redirect authentication redirect. Email:", result.user?.email);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        console.log("[Firebase Auth] Received Google OAuth access token from redirect successfully");
      }
      return result;
    } else {
      console.log("[FORENSIC] [Firebase] No redirect result found.");
    }
  } catch (error: any) {
    console.error("[FORENSIC] [Firebase] getRedirectResult failed:", error);
    throw error;
  }
  return null;
};

export const googleLogin = async () => {
  if (loginInProgress) {
    throw new Error("An authentication check is already in progress.");
  }
  
  loginInProgress = true;
  const provider = new GoogleAuthProvider();
  // Request Google Workspace Drive scopes
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');
  
  try {
    console.log("[Firebase Auth] Trying signInWithPopup first for smooth experience...");
    try {
      const result = await signInWithPopup(auth, provider);
      if (result) {
        console.log("[Firebase Auth] Successful sign-in with popup. Email:", result.user?.email);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          console.log("[Firebase Auth] Saved Google OAuth access token from popup");
        }
        return result;
      }
    } catch (popupError: any) {
      // If popup is blocked or closed by the user, we try redirect
      console.warn("[Firebase Auth] signInWithPopup failed or was blocked. Falling back to signInWithRedirect...", popupError);
      if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user' || popupError.code === 'auth/cancelled-popup-request') {
        console.log("[Firebase Auth] Initiating fallback signInWithRedirect...");
        await signInWithRedirect(auth, provider);
        return;
      }
      throw popupError;
    }
  } catch (error: any) {
    console.error("[Firebase Auth Error]", error);
    if (error.code === 'auth/network-request-failed') {
      throw new Error("User sign-in did not complete due to a network error. Please ensure you have internet access and third-party cookies are not blocked.");
    }
    if (error.code === 'auth/operation-not-allowed') {
       throw new Error("Google Sign-in is not enabled in your Firebase Console. Please enable it in Authentication > Sign-in method.");
    }
    if (error.code === 'auth/unauthorized-domain') {
       throw new Error(`This domain (${window.location.hostname}) is not authorized for Google Login. Please add "${window.location.hostname}" to the Authorized Domains list in your Firebase Console under Authentication > Settings.`);
    }
    throw error;
  } finally {
    loginInProgress = false;
  }
};

export default app;
