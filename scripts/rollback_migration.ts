import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const logSnap = await getDocs(collection(db, 'migrationLogs'));
  console.log(`Found ${logSnap.size} logs.`);
  
  for (const logDoc of logSnap.docs) {
    const log = logDoc.data();
    const { recordId, collection: colName, oldStateId, oldTerritoryId, oldCityId, oldFranchiseId } = log;
    
    console.log(`Rolling back ${colName}/${recordId}...`);
    
    await updateDoc(doc(db, colName, recordId), {
      stateId: oldStateId,
      territoryId: oldTerritoryId,
      cityId: oldCityId,
      franchiseId: oldFranchiseId,
      migrationStatus: 'ROLLED_BACK'
    });
  }
  console.log("Rollback completed.");
}

run().catch(console.error);
