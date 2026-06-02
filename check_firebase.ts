import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log("[CHECK] ProjectID:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkCollections() {
    const collections = ['drivers', 'users', 'campaigns', 'deviceScreens', 'terminals'];
    for (const collName of collections) {
        try {
            const snap = await getDocs(collection(db, collName));
            console.log(`[CHECK] Collection ${collName} count:`, snap.docs.length);
        } catch (e) {
            console.log(`[CHECK] Collection ${collName} error:`, e);
        }
    }
}

checkCollections();
