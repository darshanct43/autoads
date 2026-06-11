import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  // Just inspect 5 to get the structure rather than all to avoid timeout
  const snap = await getDocs(query(collection(db, 'campaigns'), limit(5)));
  
  snap.forEach(doc => {
      console.log(JSON.stringify(doc.data(), null, 2));
  });
}
run().catch(console.error);
