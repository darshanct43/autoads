import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  projectId: "ai-studio-2d7c0ec8-7f5b-426d-8e1a-dc77926ec5fb",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const c = await getDocs(collection(db, 'systemSettings'));
  c.forEach(d => console.log(d.id, d.data()));
  
  const c2 = await getDocs(collection(db, 'showcaseVideos'));
  c2.forEach(d => console.log(d.id, d.data()));
  
  const c3 = await getDocs(collection(db, 'static_assets'));
  c3.forEach(d => console.log(d.id, d.data()));
}
run();
