import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const querySnapshot = await getDocs(collection(db, 'drivers'));
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (JSON.stringify(data).includes('1616')) {
      console.log(doc.id, '=>', data);
    }
  });
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
