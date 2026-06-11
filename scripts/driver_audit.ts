import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const KARNATAKA_CITIES = new Set([
  'hassan', 'bangalore', 'mysore', 'mangalore', 'hubli', 'belgaum', 
  'shimoga', 'kalaburagi', 'davangere', 'ballari', 'vijayapura', 
  'raichur', 'bidar', 'gadag', 'hospet', 'chikkaballapur', 'tumakuru'
]);

async function run() {
  const driversColl = await getDocs(collection(db, 'drivers'));
  
  const total = driversColl.size;
  let ready = 0;
  let skipped = 0;
  const skippedRecords: { id: string, reason: string }[] = [];
  let sampleReady: any = null;

  driversColl.forEach(doc => {
    const data = doc.data();
    const rawCity = data.city;
    const normalizedCity = (rawCity || '').trim().toLowerCase();

    if (normalizedCity && KARNATAKA_CITIES.has(normalizedCity)) {
      ready++;
      if (!sampleReady) sampleReady = data;
    } else {
      skipped++;
      skippedRecords.push({ id: doc.id, reason: rawCity ? 'Unknown City' : 'No City Field' });
    }
  });

  console.log("DRIVER MIGRATION AUDIT");
  console.log("----------------------");
  console.log(`Total Records: ${total}`);
  console.log(`READY: ${ready}`);
  console.log(`SKIPPED: ${skipped}`);
  console.log("\nSkipped Drivers:");
  console.log(JSON.stringify(skippedRecords, null, 2));
  console.log("\nSample READY Driver (Before):");
  console.log(JSON.stringify(sampleReady, null, 2));
  
  const mapped = sampleReady ? {
      ...sampleReady,
      stateId: 'KA',
      territoryId: `T-${(sampleReady.city || '').toUpperCase()}`,
      cityId: (sampleReady.city || '').toLowerCase(),
      franchiseId: null
  } : null;
  
  console.log("\nSample READY Driver (After - Estimated):");
  console.log(JSON.stringify(mapped, null, 2));
  
  console.log("\nExpected migrationLogs Structure:");
  console.log(JSON.stringify({
      recordId: "driver_id_123",
      collection: "drivers",
      oldStateId: null,
      oldTerritoryId: null,
      oldCityId: null,
      oldFranchiseId: null,
      newStateId: "KA",
      newTerritoryId: "T-BENGALURU-URBAN",
      newCityId: "bengaluru",
      newFranchiseId: null,
      migratedAt: "ISO_TIMESTAMP"
  }, null, 2));
}

run().catch(console.error);
