import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: "json" };
import fs from 'fs';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const drivers = await getDocs(collection(db, 'drivers'));
  const cities = new Set<string>();
  drivers.forEach(d => { if (d.data().city) cities.add(d.data().city); });
  
  const campaigns = await getDocs(collection(db, 'campaigns'));
  campaigns.forEach(c => { if (c.data().targetCity) cities.add(c.data().targetCity); });

  fs.writeFileSync('cities_list.json', JSON.stringify(Array.from(cities)));
  console.log("Cities extracted");
}

run().catch(console.error);
