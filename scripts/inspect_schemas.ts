import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTIONS = ['drivers', 'users', 'campaigns', 'payments', 'driverPayments', 'supportTickets'];

async function run() {
  for (const colName of COLLECTIONS) {
    console.log(`--- SAMPLE: ${colName} ---`);
    try {
      const q = query(collection(db, colName), limit(1));
      const ss = await getDocs(q);
      if (!ss.empty) {
        console.log(JSON.stringify(ss.docs[0].data(), null, 2));
      } else {
        console.log("No data.");
      }
    } catch(e) {
      console.log(`Error reading ${colName}:`, e);
    }
  }
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
