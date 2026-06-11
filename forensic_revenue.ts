
import dotenv from 'dotenv';
dotenv.config({ override: true });
import { dbAdm } from './lib/firebase-admin';

async function run() {
  console.log("--- REVENUE FORENSIC AUDIT ---");
  try {
    const list = await dbAdm.collection('payments').get();
    console.log(`Total payments in DB: ${list.size}`);
    
    let totalRevenue = 0;
    let successfulCount = 0;

    list.forEach((doc: any) => {
      const data = doc.data();
      console.log(`ID: ${doc.id}, Amount: ${data.amount}, Status: ${data.status}`);
      if (['success', 'SUCCESS', 'paid', 'PAID'].includes(data.status)) {
        totalRevenue += (data.amount || 0);
        successfulCount++;
      }
    });
    
    console.log(`Calculated Revenue: ${totalRevenue}`);
    console.log(`Calculated Successful Count: ${successfulCount}`);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
run();
