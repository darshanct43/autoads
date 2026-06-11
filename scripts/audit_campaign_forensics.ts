import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const KARNATAKA_CITIES = new Set([
  'hassan', 'bangalore', 'mysore', 'mangalore', 'hubli', 'belgaum',
  'shimoga', 'gulbarga', 'davangere', 'bellary', 'bijapur',
  'raichur', 'bidar', 'gadag', 'hospet', 'chikkaballapur', 'tumkur'
]);

async function run() {
  const snap = await getDocs(collection(db, 'campaigns'));
  const results = {
    total: snap.size,
    empty: 0,
    karnataka: 0,
    outside: 0,
    manual: 0,
    values: new Set<string>()
  };

  snap.forEach(doc => {
    const d = doc.data();
    const city = d.targetCity;
    const state = d.targetState;

    if (!city && !state) {
        results.empty++;
        return;
    }
    
    const cityKey = (city || '').toLowerCase();
    results.values.add(`${city || 'N/A'}/${state || 'N/A'}`);

    if (city && KARNATAKA_CITIES.has(cityKey)) {
        results.karnataka++;
    } else if (state === 'Gujarat' || city === 'Ahmedabad') {
        results.outside++;
    } else {
        results.manual++;
    }
  });

  console.log(JSON.stringify({
    total: results.total,
    empty: results.empty,
    karnataka: results.karnataka,
    outside: results.outside,
    manual: results.manual,
    uniqueValues: Array.from(results.values)
  }, null, 2));
}
run().catch(console.error);
