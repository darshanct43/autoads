import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, Timestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import fs from 'fs';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const APPROVED_TERRITORIES = new Set([
  'T-BENGALURU-URBAN',
  'T-BELAGAVI',
  'T-BALLARI',
  'T-BIDAR',
  'T-CHIKKAMAGALURU',
  'T-DAVANAGERE',
  'T-DHARWAD',
  'T-GADAG',
  'T-HASSAN',
  'T-KALABURAGI',
  'T-KOLAR',
  'T-MANDYA',
  'T-MYSURU',
  'T-RAICHUR',
  'T-SHIVAMOGGA',
  'T-TUMAKURU',
  'T-UDUPI',
  'T-VIJAYANAGARA',
  'T-VIJAYAPURA',
  'T-YADGIR'
]);

async function verifyMigratedDrivers() {
  const driversSnap = await getDocs(collection(db, 'drivers'));
  
  let totalChecked = 0;
  let passed = 0;
  let failed = 0;
  const failureDetails: { id: string, reason: string }[] = [];
  const territoryCounts: Record<string, number> = {};
  let validTerritoryCount = 0;
  let invalidTerritoryCount = 0;

  driversSnap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.migrationStatus === 'COMPLETED') {
      totalChecked++;
      
      let isPassed = true;
      let reasons: string[] = [];

      if (data.stateId !== 'KA') {
        isPassed = false;
        reasons.push(`Invalid stateId: ${data.stateId}`);
      }

      if (data.territoryId && APPROVED_TERRITORIES.has(data.territoryId)) {
        territoryCounts[data.territoryId] = (territoryCounts[data.territoryId] || 0) + 1;
        validTerritoryCount++;
      } else {
        isPassed = false;
        invalidTerritoryCount++;
        reasons.push(`Invalid territoryId: ${data.territoryId}`);
        territoryCounts['INVALID'] = (territoryCounts['INVALID'] || 0) + 1;
      }
      
      if (!data.cityId) {
        isPassed = false;
        reasons.push(`Missing cityId`);
      }

      if (data.franchiseId === undefined) {
          isPassed = false;
          reasons.push(`Missing franchiseId field`);
      }

      if (isPassed) {
        passed++;
      } else {
        failed++;
        failureDetails.push({ id: docSnap.id, reason: reasons.join(', ') });
      }
    }
  });

  return { totalChecked, passed, failed, failureDetails, territoryCounts, validTerritoryCount, invalidTerritoryCount };
}

async function verifyMigrationLogs() {
  const logsSnap = await getDocs(collection(db, 'migrationLogs'));
  
  let validLogs = 0;
  let invalidLogs = 0;
  let rollbackReady = true;

  logsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      let isValid = true;
      let isRollbackReady = true;

      // Integrity Check
      if (!data.recordId || !data.collection || data.oldStateId === undefined || 
          data.oldTerritoryId === undefined || data.oldCityId === undefined || 
          data.oldFranchiseId === undefined || !data.migratedAt) {
          isValid = false;
      }

      // Rollback Readiness Check
      if (!data.recordId || data.oldStateId === undefined || 
          data.oldTerritoryId === undefined || data.oldCityId === undefined || 
          data.oldFranchiseId === undefined) {
          isRollbackReady = false;
      }

      if (isValid) validLogs++;
      else invalidLogs++;

      if (!isRollbackReady) rollbackReady = false;
  });

  return { total: logsSnap.size, validLogs, invalidLogs, rollbackReady };
}

async function run() {
  console.log("Starting Migration Verification...");
  
  const driversVerdict = await verifyMigratedDrivers();
  console.log("\n--- DRIVERS MIGRATION VERIFICATION ---");
  console.log(`Total Checked : ${driversVerdict.totalChecked}`);
  console.log(`Passed        : ${driversVerdict.passed}`);
  console.log(`Failed        : ${driversVerdict.failed}`);
  
  console.log("\n--- TERRITORY VERIFICATION ---");
  console.log(`Valid Territory Count  : ${driversVerdict.validTerritoryCount}`);
  console.log(`Invalid Territory Count: ${driversVerdict.invalidTerritoryCount}`);
  for (const [territory, count] of Object.entries(driversVerdict.territoryCounts)) {
      console.log(`${territory} : ${count}`);
  }

  if (driversVerdict.failed > 0) {
    console.log("\nFailure Details:");
    console.log(JSON.stringify(driversVerdict.failureDetails, null, 2));
  }

  const logsVerdict = await verifyMigrationLogs();
  console.log("\n--- MIGRATION LOGS VERIFICATION ---");
  console.log(`Total Logs Found: ${logsVerdict.total}`);
  console.log(`Valid Logs      : ${logsVerdict.validLogs}`);
  console.log(`Invalid Logs    : ${logsVerdict.invalidLogs}`);
  console.log(`Rollback Ready  : ${logsVerdict.rollbackReady}`);

  const report = {
      driversChecked: driversVerdict.totalChecked,
      passed: driversVerdict.passed,
      failed: driversVerdict.failed,
      validLogs: logsVerdict.validLogs,
      invalidLogs: logsVerdict.invalidLogs,
      rollbackReady: logsVerdict.rollbackReady,
      generatedAt: new Date().toISOString()
  };

  fs.writeFileSync('migration_verification_report.json', JSON.stringify(report, null, 2));
  console.log("\nReport exported to migration_verification_report.json");
}

run().catch(console.error);
