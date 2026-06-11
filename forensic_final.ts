import dotenv from 'dotenv';
dotenv.config({ override: true });
import { dbAdm } from './lib/firebase-admin';

async function run() {
  console.log("--- FINAL VERIFICATION AUDIT ---");
  
  // Revenue
  const paymentsSnap = await dbAdm.collection('payments').get();
  let prodRev = 0, testRev = 0, prodCount = 0, testCount = 0;
  paymentsSnap.forEach(doc => {
    const data = doc.data();
    if (['success', 'SUCCESS', 'paid', 'PAID'].includes(data.status)) {
        if (data.isTest) {
            testRev += (data.amount || 0);
            testCount++;
        } else {
            prodRev += (data.amount || 0);
            prodCount++;
        }
    }
  });
  console.log(`REVENUE: ProdCount=${prodCount}, TestCount=${testCount}, ProdRev=${prodRev}, TestRev=${testRev}`);

  // Tickets
  const ticketsSnap = await dbAdm.collection('supportTickets').get();
  const statuses = { open: 0, resolved: 0, closed: 0, archived: 0, total: 0 };
  ticketsSnap.forEach(doc => {
      const status = (doc.data().status || 'open').toLowerCase();
      if (status in statuses) statuses[status as keyof typeof statuses]++;
      statuses.total++;
  });
  console.log(`TICKETS: Stats=${JSON.stringify(statuses)}`);
}
run();
