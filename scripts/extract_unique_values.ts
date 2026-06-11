import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit, startAfter, QuerySnapshot } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: "json" };
import fs from 'fs';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const cities = new Set<string>();
  const states = new Set<string>();

  console.log("Starting extraction...");

  // Optimized extraction to avoid timeouts
  for (const collectionName of ['drivers', 'campaigns']) {
    console.log(`Processing ${collectionName}...`);
    let lastVisible = null;
    let keepFetching = true;
    
    while (keepFetching) {
      let q = query(collection(db, collectionName), limit(50));
      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }
      
      const snap = await getDocs(q);
      
      if (snap.empty) {
        keepFetching = false;
        break;
      }
      
      snap.forEach(doc => {
        const data = doc.data();
        if (collectionName === 'drivers' && data.city) cities.add(data.city);
        if (collectionName === 'campaigns') {
          if (data.targetCity) cities.add(data.targetCity);
          if (data.targetState) states.add(data.targetState);
        }
      });
      
      lastVisible = snap.docs[snap.docs.length - 1];
    }
  }

  const uniqueCities = Array.from(cities).sort();
  const uniqueStates = Array.from(states).sort();

  const template = {
    cityMapping: uniqueCities.map(city => ({
      originalName: city,
      targetCityId: null,      
      targetTerritoryId: null, 
      targetFranchiseId: null, 
      status: 'MANUAL_REVIEW'
    })),
    stateMapping: uniqueStates.map(state => ({
      originalName: state,
      targetStateId: null,
      status: 'MANUAL_REVIEW'
    }))
  };

  fs.writeFileSync('mapping_template.json', JSON.stringify(template, null, 2));
  
  console.log(`Unique Cities found: ${uniqueCities.length}`);
  console.log(`Unique States found: ${uniqueStates.length}`);
  console.log("Template generated: mapping_template.json");
}

run().catch(console.error);
