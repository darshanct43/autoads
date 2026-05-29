import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const querySnapshot = await getDocs(collection(db, 'campaigns'));
  for (const dbDoc of querySnapshot.docs) {
    if (dbDoc.data().title?.toLowerCase().includes('showcase')) {
      await deleteDoc(doc(db, 'campaigns', dbDoc.id));
      console.log('Deleted:', dbDoc.id, dbDoc.data().title);
    }
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
