
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Initialize Firebase Admin (assuming default credentials or SA)
// Based on probe_cf.ts and other scripts, we can use the service account
const serviceAccountPath = './firebase-service-account.json';
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function deleteCollection(collectionName: string) {
  console.log(`Cleaning up collection: ${collectionName}`);
  const snapshot = await db.collection(collectionName).get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`Deleted ${snapshot.size} documents from ${collectionName}`);
}

async function runCleanup() {
  try {
    await deleteCollection('iotSims');
    await deleteCollection('deviceTelemetry');
    await deleteCollection('iotRechargeHistory');
    await deleteCollection('connectivityAlerts');
    console.log("Cleanup complete!");
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

runCleanup();
