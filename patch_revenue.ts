
import { dbAdm } from './lib/firebase-admin';

async function patch() {
  console.log("--- PATCHING TEST PAYMENTS ---");
  const list = await dbAdm.collection('payments').get();
  
  let patchedCount = 0;
  for (const doc of list.docs) {
    const data = doc.data();
    const isTest = data.amount === 50 || (data.transactionId && data.transactionId.includes('test'));
    
    if (isTest) {
      await doc.ref.update({ isTest: true });
      console.log(`Patched ${doc.id} as isTest: true`);
      patchedCount++;
    } else {
      await doc.ref.update({ isTest: false });
    }
  }
  console.log(`Patched ${patchedCount} documents.`);
}

patch();
