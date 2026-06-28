import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getServiceAccount() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return null;
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    let saJsonLines: string[] = [];
    let insideSA = false;
    for (const line of lines) {
      if (line.trim().startsWith('FIREBASE_SERVICE_ACCOUNT=')) {
        insideSA = true;
        const val = line.substring(line.indexOf('=') + 1).trim();
        saJsonLines.push(val);
        if (val.endsWith('}')) break;
        continue;
      }
      if (insideSA) {
        saJsonLines.push(line);
        if (line.trim() === '}') {
          break;
        }
      }
    }
    if (saJsonLines.length > 0) {
      const rawJson = saJsonLines.join('\n');
      return JSON.parse(rawJson);
    }
  } catch (e) {}
  return null;
}

const serviceAccount = getServiceAccount();
if (serviceAccount) {
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }
}

const db = getFirestore();

const TARGET_COLLECTIONS = [
  'campaigns',
  'payments',
  'drivers',
  'devices',
  'terminals',
  'tickets',
  'withdrawRequests',
  'notifications',
  'driverAssignments',
  'campaignAnalytics',
  'campaignReports',
  'customers'
];

async function runVerify() {
  console.log("=========================================");
  console.log("VERIFYING CURRENT COLLECTION COUNTS...");
  console.log("=========================================");
  let totalDocs = 0;
  for (const colName of TARGET_COLLECTIONS) {
    try {
      const snap = await db.collection(colName).get();
      console.log(`Collection [${colName}]: ${snap.size} docs`);
      totalDocs += snap.size;
    } catch (e: any) {
      console.log(`Collection [${colName}]: ERROR (${e.message})`);
    }
  }
  console.log(`TOTAL DOCUMENTS ACROSS TARGETS = ${totalDocs}`);
}

runVerify();
