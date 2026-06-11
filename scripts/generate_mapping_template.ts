import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: "json" };
import fs from 'fs';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const cities = new Set<string>();

  // Extract from drivers
  const driverSnap = await getDocs(collection(db, 'drivers'));
  driverSnap.forEach(doc => {
    const data = doc.data();
    if (data.city) cities.add(data.city);
  });

  // Extract from campaigns
  const campSnap = await getDocs(collection(db, 'campaigns'));
  campSnap.forEach(doc => {
    const data = doc.data();
    if (data.targetCity) cities.add(data.targetCity);
  });

  const template = {
    cityMapping: Array.from(cities).map(city => ({
      originalName: city,
      targetCityId: null,
      targetTerritoryId: null,
      targetFranchiseId: null
    }))
  };

  fs.writeFileSync('mapping_template.json', JSON.stringify(template, null, 2));
  console.log("Template generated: mapping_template.json");
}

run().catch(console.error);
