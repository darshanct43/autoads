
import dotenv from 'dotenv';
dotenv.config({ override: true });
import { dbAdm } from './lib/firebase-admin';

async function run() {
  console.log("--- SUPPORT TICKET FORENSIC AUDIT ---");
  try {
    const allTickets = await dbAdm.collection('supportTickets').get();
    console.log(`Total tickets in DB: ${allTickets.size}`);
    
    // Portal code usually uses specific queries/filters. Let's see all statuses.
    const statuses: Record<string, number> = {};
    allTickets.forEach((doc: any) => {
      const data = doc.data();
      const status = data.status || 'unknown';
      statuses[status] = (statuses[status] || 0) + 1;
    });
    console.log(`Ticket statuses:`, statuses);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
run();
