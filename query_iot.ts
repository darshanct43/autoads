
import dotenv from 'dotenv';
dotenv.config({ override: true });

import { dbAdm } from './lib/firebase-admin';

async function run() {
  console.log("--- QUERYING IOT SIMS VIA ADMIN SDK ---");
  try {
    const list = await dbAdm.collection('iotSims').get();
    console.log(`Found ${list.size} iotSims documents:`);
    list.forEach((doc: any) => {
      console.log(`IOT SIM DOC ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
  } catch (err: any) {
    console.error("Error reading iotSims:", err.message);
  }
}

run();
