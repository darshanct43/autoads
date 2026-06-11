
import dotenv from 'dotenv';
dotenv.config({ override: true });
import { dbAdm } from './lib/firebase-admin';

async function run() {
  console.log("--- IOT FORENSIC AUDIT ---");
  try {
    const list = await dbAdm.collection('iotSims').get();
    list.forEach((doc: any) => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  Creation Time: ${data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : 'N/A'}`);
      console.log(`  Last Update: ${data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : 'N/A'}`);
    });
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
run();
