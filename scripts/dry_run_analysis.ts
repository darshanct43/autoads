import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTIONS = ['supportTickets', 'auditLogs', 'relayMessages', 'supportRooms', 'devices', 'mediaAssets', 'exports', 'workers'];

async function run() {
  console.log("--- STARTING DRY RUN ANALYSIS ---");
  for (const colName of COLLECTIONS) {
    const querySnapshot = await getDocs(collection(db, colName));
    let total = 0;
    let missingTerritory = 0;

    querySnapshot.forEach((doc) => {
      total++;
      const data = doc.data();
      if (!data.stateId || !data.territoryId || !data.cityId) {
        missingTerritory++;
      }
    });

    console.log(`Collection: ${colName}`);
    console.log(`Total Records: ${total}`);
    console.log(`Missing Mapping (Requires Mapping): ${missingTerritory}`);
    console.log(`Auto-Mapped: ${total - missingTerritory}`);
    
    // Confidence is subjective based on how many have cityId etc, assuming 50% for now as a placeholder for dry run
    const confidence = total > 0 ? ((total - missingTerritory) / total) * 100 : 100;
    console.log(`Mapping Confidence: ${confidence.toFixed(2)}%`);
    console.log("---------------------------------");
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
