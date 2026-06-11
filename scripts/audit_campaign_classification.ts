import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const KARNATAKA_CITIES = new Set([
  'Hassan', 'Bangalore', 'Mysore', 'Mangalore', 'Hubli', 'Belgaum',
  'Shimoga', 'Kalaburagi', 'Davangere', 'Ballari', 'Vijayapura',
  'Raichur', 'Bidar', 'Gadag', 'Hospet', 'Chikkaballapur', 'Tumakuru'
]);

async function run() {
  const snap = await getDocs(collection(db, 'campaigns'));
  let ready = 0;
  let outside = 0;
  let manual = 0;

  snap.forEach(doc => {
    const d = doc.data();
    const city = d.targetCity;
    if (!city) {
      manual++;
    } else if (KARNATAKA_CITIES.has(city)) {
      ready++;
    } else if (city === 'Ahmedabad' || city === 'N/A') {
      outside++;
    } else {
      manual++;
    }
  });

  console.log(`READY: ${ready}`);
  console.log(`OUTSIDE_KARNATAKA: ${outside}`);
  console.log(`MANUAL_REVIEW: ${manual}`);
  console.log(`TOTAL: ${snap.size}`);
}
run().catch(console.error);
