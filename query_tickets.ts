
import dotenv from 'dotenv';
dotenv.config({ override: true });

import { dbAdm } from './lib/firebase-admin';

async function run() {
  console.log("--- QUERYING SUPPORT TICKETS VIA ADMIN SDK ---");
  try {
    const list = await dbAdm.collection('supportTickets').get();
    console.log(`Found ${list.size} supportTickets documents:`);
    list.forEach((doc: any) => {
      console.log(`TICKET ID: ${doc.id}`);
      // Only part of the data to avoid spamming output
    });
  } catch (err: any) {
    console.error("Error reading supportTickets:", err.message);
  }
}

run();
