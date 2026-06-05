import dotenv from 'dotenv';
dotenv.config({ override: true });

import { dbAdm } from './lib/firebase-admin';

async function run() {
  console.log("--- QUERYING PAYMENTS VIA ADMIN SDK ---");
  try {
    const list = await dbAdm.collection('payments').orderBy('createdAt', 'desc').limit(5).get();
    console.log(`Found ${list.size} payments:`);
    list.forEach((doc: any) => {
      console.log(`PAYMENT ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
  } catch (err: any) {
    console.error("Error reading payments:", err.message);
  }

  console.log("--- QUERYING CAMPAIGNS VIA ADMIN SDK ---");
  try {
    const list = await dbAdm.collection('campaigns').orderBy('updatedAt', 'desc').limit(5).get();
    console.log(`Found ${list.size} campaigns:`);
    list.forEach((doc: any) => {
      console.log(`CAMPAIGN ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
  } catch (err: any) {
    console.error("Error reading campaigns:", err.message);
  }
}

run();
