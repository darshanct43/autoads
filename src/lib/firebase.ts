import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

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
