import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseAppletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseAppletConfig.firestoreDatabaseId || '(default)');

async function run() {
  console.log("=== RUNNING DETAILED TRACE ON FIRESTORE DRIVER RECORDS ===");
  try {
    const snap = await getDocs(collection(db, 'drivers'));
    console.log(`Successfully fetched ${snap.size} legacy/current driver documents.\n`);

    snap.forEach((doc) => {
      const data = doc.data();
      console.log(`DRIVER ID: ${doc.id}`);
      console.log(`- Human Name: ${data.name || data.fullName || '(unset)'}`);
      console.log(`- Status: ${data.status}`);
      console.log(`- KYC Status: ${data.kycStatus}`);
      console.log(`- documents.aadhaar: ${data.documents?.aadhaar || 'UNDEFINED'}`);
      console.log(`- documents.drivingLicense: ${data.documents?.drivingLicense || 'UNDEFINED'}`);
      console.log(`- _agreementData: ${data._agreementData ? JSON.stringify(data._agreementData, null, 2) : 'UNDEFINED'}`);
      console.log(`- aadharPhoto (direct): ${data.aadharPhoto || 'UNDEFINED'}`);
      console.log(`- dlPhoto (direct): ${data.dlPhoto || 'UNDEFINED'}`);
      console.log(`- selfiePhoto (direct): ${data.selfiePhoto || 'UNDEFINED'}`);
      console.log(`- signatureUrl (direct): ${data.signatureUrl || 'UNDEFINED'}`);
      console.log(`- profileImage (direct): ${data.profileImage || 'UNDEFINED'}`);
      console.log(`-------------------------------------------------------------------------\n`);
    });
    process.exit(0);
  } catch (error: any) {
    console.error("Firestore retrieval error:", error.message || error);
    process.exit(1);
  }
}

run();
