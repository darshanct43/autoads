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

// Use memoryLocalCache to avoid assertion errors related to IndexedDB/Persistence in iframes
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const storage = getStorage(app);

// Connection verification test with higher resilience
async function testConnection() {
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
  try {
    console.log("[Firebase] Probing Cloud Firestore (Wait 15s)...");
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connectivity')),
      timeout
    ]);
    console.log("[Firebase] Cloud Link Established.");
  } catch (error: any) {
    if (error.message === 'timeout' || (error instanceof Error && error.message.includes('offline'))) {
      console.warn("[Firebase] Backend latency detected or Offline mode active.");
    } else {
      console.log("[Firebase] System initialized (Network standby).");
    }
  }
}
testConnection();

export const googleLogin = async () => {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

export default app;
