import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setupDemoEnvironment() {
  console.log("🚀 Starting Demo Environment Setup...");

  const demoUid = "demo_driver_auth_uid";
  const terminalId = "TRM-DEMO-8861";
  const accessKey = "8861";

  const batch = writeBatch(db);

  // 1. Create User Profile
  const userRef = doc(db, 'users', demoUid);
  batch.set(userRef, {
    uid: demoUid,
    name: "Demo Driver",
    phone: "8861574729",
    role: "DRIVER",
    isApproved: true,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // 2. Create Driver Profile
  const driverRef = doc(db, 'drivers', demoUid);
  batch.set(driverRef, {
    uid: demoUid,
    name: "Demo Driver",
    phone: "8861574729",
    password: "123456", // Stored for the custom auth fallback if needed
    status: 'active',
    isVerified: true,
    terminalId: terminalId,
    accessKey: accessKey,
    provisionStatus: 'PROVISIONED',
    createdAt: serverTimestamp()
  }, { merge: true });

  // 3. Create Terminal Record
  const terminalRef = doc(db, 'terminals', terminalId);
  batch.set(terminalRef, {
    id: terminalId,
    driverId: demoUid,
    accessKey: accessKey,
    status: 'ACTIVE',
    onlineStatus: 'ONLINE',
    createdAt: serverTimestamp(),
    lastPulse: serverTimestamp()
  }, { merge: true });

  // 4. Create Dummy Advertiser Campaign
  const campaignId = "demo_campaign_id";
  const campaignRef = doc(db, 'campaigns', campaignId);
  
  const ads = [
    { type: 'VIDEO', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    { type: 'VIDEO', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    { type: 'VIDEO', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
    { type: 'IMAGE', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1000&auto=format&fit=crop' },
    { type: 'IMAGE', url: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=1000&auto=format&fit=crop' }
  ];

  batch.set(campaignRef, {
    id: campaignId,
    title: "Demo AutoAds Campaign",
    clientName: "AutoAds Global",
    status: 'ACTIVE',
    mediaType: 'VIDEO', // Main fallback
    mediaUrl: ads[0].url,
    assignedDrivers: [demoUid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ads: ads // Store the rotation list directly in the campaign
  }, { merge: true });

  // 5. Create Driver Assignment
  const assignmentId = `asgn_${demoUid}_${campaignId}`;
  const assignmentRef = doc(db, 'driverAssignments', assignmentId);
  batch.set(assignmentRef, {
    driverId: demoUid,
    campaignId: campaignId,
    status: 'running',
    earnings: 0,
    createdAt: serverTimestamp()
  }, { merge: true });

  try {
    await batch.commit();
    console.log("✅ Demo Environment Populated Successfully!");
    console.log("-----------------------------------------");
    console.log("Driver Credentials:");
    console.log("Phone: 8861574729");
    console.log("Pass:  123456");
    console.log("Terminal ID: " + terminalId);
    console.log("-----------------------------------------");
  } catch (error) {
    console.error("❌ Setup Failed:", error);
  }
}

setupDemoEnvironment();
