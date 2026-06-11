
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MAPPING: Record<string, { territoryId: string, cityId: string, franchiseId: string | null }> = {
  'hassan': { territoryId: 'T-HASSAN', cityId: 'hassan', franchiseId: 'fr-has-01' },
  'bangalore': { territoryId: 'T-BENGALURU-URBAN', cityId: 'bengaluru', franchiseId: 'fr-blr-01' },
  'mysore': { territoryId: 'T-MYSURU', cityId: 'mysuru', franchiseId: 'fr-mys-01' },
  'mangalore': { territoryId: 'T-MANGALURU', cityId: 'mangaluru', franchiseId: 'fr-mng-01' },
  'hubli': { territoryId: 'T-DHARWAD', cityId: 'hubli', franchiseId: 'fr-hub-01' },
  'belgaum': { territoryId: 'T-BELAGAVI', cityId: 'belagavi', franchiseId: null },
  'shimoga': { territoryId: 'T-SHIVAMOGGA', cityId: 'shivamogga', franchiseId: null },
  'kalaburagi': { territoryId: 'T-KALABURAGI', cityId: 'gulbarga', franchiseId: null },
  'davangere': { territoryId: 'T-DAVANAGERE', cityId: 'davangere', franchiseId: null },
  'ballari': { territoryId: 'T-BALLARI', cityId: 'bellary', franchiseId: null },
  'vijayapura': { territoryId: 'T-VIJAYAPURA', cityId: 'bijapur', franchiseId: null },
  'raichur': { territoryId: 'T-RAICHUR', cityId: 'raichur', franchiseId: null },
  'bidar': { territoryId: 'T-BIDAR', cityId: 'bidar', franchiseId: null },
  'gadag': { territoryId: 'T-GADAG', cityId: 'gadag', franchiseId: null },
  'hospet': { territoryId: 'T-VIJAYANAGARA', cityId: 'hospet', franchiseId: null },
  'chikkaballapur': { territoryId: 'T-CHIKKABALLAPUR', cityId: 'chikkaballapur', franchiseId: null },
  'tumakuru': { territoryId: 'T-TUMAKURU', cityId: 'tumkur', franchiseId: null },
  'chikkamagaluru': { territoryId: 'T-CHIKKAMAGALURU', cityId: 'chikkamagaluru', franchiseId: null },
  'kolar': { territoryId: 'T-KOLAR', cityId: 'kolar', franchiseId: null },
  'mandya': { territoryId: 'T-MANDYA', cityId: 'mandya', franchiseId: null },
  'udupi': { territoryId: 'T-UDUPI', cityId: 'udupi', franchiseId: null },
  'yadgir': { territoryId: 'T-YADGIR', cityId: 'yadgir', franchiseId: null }
};

async function migrateCollection(colName: string, cityField: string, dryRun: boolean) {
  const snapshot = await getDocs(collection(db, colName));
  const results = { total: snapshot.size, migrated: 0, skipped: 0, failed: 0 };
  const readyRecords: any[] = [];
  const skippedRecords: { id: string, reason: string }[] = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const rawCity = data[cityField];
    const normalizedCityKey = (rawCity || '').trim().toLowerCase();

    if (normalizedCityKey && MAPPING[normalizedCityKey]) {
      const mapping = MAPPING[normalizedCityKey];
      const updateData = {
        stateId: 'KA',
        territoryId: mapping.territoryId,
        cityId: mapping.cityId,
        franchiseId: mapping.franchiseId,
        migrationStatus: 'COMPLETED'
      };

      if (!dryRun) {
        try {
          await updateDoc(docSnap.ref, updateData);
          await addDoc(collection(db, 'migrationLogs'), {
            recordId: docSnap.id,
            collection: colName,
            oldStateId: data.stateId || null,
            oldTerritoryId: data.territoryId || null,
            oldCityId: data.cityId || null,
            oldFranchiseId: data.franchiseId || null,
            ...updateData,
            migratedAt: serverTimestamp()
          });
          results.migrated++;
        } catch (e) {
          results.failed++;
        }
      } else {
        readyRecords.push({ docId: docSnap.id, originalCity: rawCity, ...updateData });
        results.migrated++;
      }
    } else {
      results.skipped++;
      skippedRecords.push({ id: docSnap.id, reason: rawCity ? `City '${rawCity}' not in mapping` : 'No city field' });
    }
  }
  return { results, readyRecords, skippedRecords };
}

async function run() {
  const hasDryRun = process.argv.includes('--mode=dry-run');
  const hasExecute = process.argv.includes('--mode=execute');

  if (!hasDryRun && !hasExecute) {
    console.error("ERROR: Must specify --mode=dry-run or --mode=execute");
    process.exit(1);
  }
  if (hasDryRun && hasExecute) {
    console.error("ERROR: Cannot specify both --mode=dry-run and --mode=execute");
    process.exit(1);
  }

  const isDryRun = hasDryRun;
  console.log(`Starting Migration Batch 1 (Dry Run: ${isDryRun})...`);
  
  const driverRes = await migrateCollection('drivers', 'city', isDryRun);
  
  console.log("--- DRIVER MIGRATION REPORT ---");
  console.log(JSON.stringify(driverRes.results, null, 2));
  
  console.log("\n--- READY RECORDS (Mapping) ---");
  console.log(JSON.stringify(driverRes.readyRecords, null, 2));

  console.log("\n--- SKIPPED RECORDS ---");
  console.log(JSON.stringify(driverRes.skippedRecords, null, 2));
  
  if (driverRes.readyRecords.length > 0) {
    console.log("\n--- SAMPLE MIGRATION LOG ENTRY ---");
    console.log(JSON.stringify({
        recordId: driverRes.readyRecords[0].docId,
        collection: 'drivers',
        oldStateId: null,
        oldTerritoryId: null,
        oldCityId: null,
        oldFranchiseId: null,
        newStateId: driverRes.readyRecords[0].stateId,
        newTerritoryId: driverRes.readyRecords[0].territoryId,
        newCityId: driverRes.readyRecords[0].cityId,
        newFranchiseId: driverRes.readyRecords[0].franchiseId,
        migratedAt: 'ISO_TIMESTAMP'
    }, null, 2));
  }
}

run().catch(console.error);
