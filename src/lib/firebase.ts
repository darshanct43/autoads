import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
const firebaseConfig = {
  apiKey: "AIzaSyDLwQwpYKjFVrbnP9Iwz6r3EAQsVaiCr3A",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Log the Project ID on initialization to confirm correct connection
console.log("[Firebase] Initializing with Project ID:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
(window as any)._firebaseApp = app;
(window as any)._firebaseConfig = firebaseConfig;
console.log("[Firebase] Global App and Config exposed to window for debugging.");

// Use memoryLocalCache to avoid assertion errors related to IndexedDB/Persistence
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);
export const storage = getStorage(app);

// Connection verification test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("[Firebase] Connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("[Firebase] Warning: The client appears to be offline or connectivity is limited.");
    } else {
      console.log("[Firebase] Connectivity check completed.");
    }
  }
}
testConnection();

export const googleLogin = async () => {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

export default app;
