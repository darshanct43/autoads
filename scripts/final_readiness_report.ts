import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const KARNATAKA_CITIES = new Set([
  'Hassan', 'Bangalore', 'Mysore', 'Mangalore', 'Hubli', 'Belgaum', 
  'Shimoga', 'Kalaburagi', 'Davangere', 'Ballari', 'Vijayapura', 
  'Raichur', 'Bidar', 'Gadag', 'Hospet', 'Chikkaballapur', 'Tumakuru'
]);

async function run() {
  const drivers = await getDocs(collection(db, 'drivers'));
  const campaigns = await getDocs(collection(db, 'campaigns'));
  const users = await getDocs(collection(db, 'users'));

  const report = {
    drivers: { total: drivers.size, ready: 0, manual: 0 },
    campaigns: { total: campaigns.size, ready: 0, outside: 0 },
    users: { total: users.size, auto: 0, manual: 0 },
    cities: { total: 0, karnataka: 0, outside: 0, manual: 0 }
  };

  const allCities = new Set<string>();

  drivers.forEach(doc => {
    const city = doc.data().city;
    if (city) {
      allCities.add(city);
      if (KARNATAKA_CITIES.has(city)) report.drivers.ready++;
      else report.drivers.manual++;
    } else { report.drivers.manual++; }
  });

  campaigns.forEach(doc => {
    const city = doc.data().targetCity;
    if (city) {
      allCities.add(city);
      if (KARNATAKA_CITIES.has(city)) report.campaigns.ready++;
      else report.campaigns.outside++;
    } else { report.campaigns.outside++; }
  });

  users.forEach(doc => {
    // Only manual mapping possible as per audit
    report.users.manual++;
  });

  report.cities.total = allCities.size;
  allCities.forEach(city => {
    if (KARNATAKA_CITIES.has(city)) report.cities.karnataka++;
    else if (city === 'Ahmedabad' || city === 'N/A') report.cities.outside++;
    else report.cities.manual++;
  });

  console.log(JSON.stringify(report, null, 2));
}

run().catch(console.error);
