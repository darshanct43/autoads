
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function check(col) {
  try {
    console.log(`[${new Date().toISOString()}] Starting ${col}...`);
    const colRef = collection(db, col);
    console.log(`[${new Date().toISOString()}] Got Ref for ${col}`);
    const q = query(colRef, limit(5));
    console.log(`[${new Date().toISOString()}] Query created for ${col}`);
    const snap = await getDocs(q);
    console.log(`[${new Date().toISOString()}] snap received for ${col}`);
    const toDelete = snap.docs.filter(d => {
      const data = d.data();
      return data.isTest === true || (data.name || "").includes("DEMO") || (data.name || "").includes("TEST");
    });
    console.log(`${col}: ${toDelete.length} test items (in first 20)`);
    toDelete.slice(0, 2).forEach(d => {
       console.log(`  - ID: ${d.id}, Name: ${d.data().name}, Res: ${d.data().isTest ? "isTest" : "NameMatch"}`);
    });
  } catch (e) {
    console.log(`${col}: Error ${e.message}`);
  }
}

async function main() {
  await check("campaigns");
  await check("payments");
  await check("drivers");
}
main();
