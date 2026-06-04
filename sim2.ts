import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  projectId: "ai-studio-2d7c0ec8-7f5b-426d-8e1a-dc77926ec5fb",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snapshot = await getDocs(collection(db, "drivers"));
  snapshot.docs.forEach((doc) => {
    console.log(doc.id, JSON.stringify(doc.data(), null, 2));
  });
}
run();
