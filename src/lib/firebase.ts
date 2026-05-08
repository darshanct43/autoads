import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDLwQwpYKjFVrbnP9Iwz6r3EAQsVaiCr3A",
  authDomain: "autoads-18b26.firebaseapp.com",
  projectId: "autoads-18b26",
  storageBucket: "autoads-18b26.firebasestorage.app",
  messagingSenderId: "195891414080",
  appId: "1:195891414080:web:8149fd51d5c034d4b0cba5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Debug logs
console.log("[Firebase] Initializing with Project ID:", firebaseConfig.projectId);

(window as any)._firebaseApp = app;
(window as any)._firebaseConfig = firebaseConfig;

console.log("[Firebase] Global App and Config exposed to window for debugging.");

// Firestore
export const db = getFirestore(app);

// Auth
export const auth = getAuth(app);

// Storage
export const storage = getStorage(app);

// Connection verification test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("[Firebase] Connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("[Firebase] Warning: Offline or limited connectivity.");
    } else {
      console.log("[Firebase] Connectivity check completed.");
    }
  }
}

testConnection();

// Google Login
export const googleLogin = async () => {
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
};

export default app;