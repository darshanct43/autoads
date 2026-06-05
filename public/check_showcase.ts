import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const querySnapshot = await getDocs(collection(db, 'campaigns'));
  querySnapshot.forEach((doc) => {
    if (doc.data().title?.includes('SHOWCASE') || doc.data().title?.includes('Showcase') || doc.data().title?.includes('showcase')) {
      console.log(doc.id, '=>', doc.data());
    }
  });
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
