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
  console.log("=== SCANNING ALL FIRESTORE DISK PATHS FOR 1780500 TIMESTAMPS ===");
  try {
    const driversSnap = await getDocs(collection(db, 'drivers'));
    console.log(`Found ${driversSnap.size} driver documents.`);
    
    driversSnap.forEach((doc) => {
      const data = doc.data();
      const str = JSON.stringify(data);
      if (str.includes("1780500")) {
        console.log(`\n>>> MATCH IN DRIVER [${doc.id}]:`);
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log(`Driver ${doc.id} (${data.name}) does not match 1780500.`);
      }
    });

    // Also check driverDocuments/driverDocs or whatever tracking collection
    const docsCollName = 'driverDocuments'; // see what was imported or mentioned before
    try {
      const docsSnap = await getDocs(collection(db, docsCollName));
      console.log(`\nFound ${docsSnap.size} documents in ${docsCollName}.`);
      docsSnap.forEach(doc => {
        const data = doc.data();
        const str = JSON.stringify(data);
        if (str.includes("1780500")) {
          console.log(`>>> MATCH IN ${docsCollName} [${doc.id}]:`);
          console.log(JSON.stringify(data, null, 2));
        }
      });
    } catch (e: any) {
      console.log(`Could not query ${docsCollName}: ${e.message}`);
    }
  } catch (error: any) {
    console.error("Scanning error:", error.message || error);
  }
  process.exit(0);
}

run();
