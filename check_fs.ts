import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "ai-studio-2d7c0ec8-7f5b-426d-8e1a-dc77926ec5fb",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Fetching showcaseVideos...');
  const coll = await getDocs(collection(db, 'showcaseVideos'));
  let found = false;
  coll.forEach(d => {
    found = true;
    console.log(d.id, d.data());
  });
  if (!found) console.log('Empty collection showcaseVideos');
  
  console.log('Fetching single doc systemSettings/showcase...');
  try {
     const dd = await getDoc(doc(db, 'systemSettings', 'showcase'));
     console.log(dd.id, dd.data());
  } catch(e) {}
}
run();
