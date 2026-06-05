import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  console.log("Fetching payments...");
  try {
    const querySnapshot = await getDocs(collection(db, "payments"));
    console.log(`Successfully fetched ${querySnapshot.size} payments:`);
    querySnapshot.forEach((doc) => {
      console.log(`PAYMENT DOC ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
  } catch (err: any) {
    console.error("Client SDK query failed:", err.message);
  }
}

run();
