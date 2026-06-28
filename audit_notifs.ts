
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

function parseServiceAccount(raw: string | undefined): any {
  if (!raw || !raw.trim()) return null;
  const clean = raw.trim();
  try { return JSON.parse(clean); } catch (e) {
    try {
      const dequoted = clean.replace(/^["']|["']$/g, '').trim();
      return JSON.parse(dequoted);
    } catch (e2) {
      try {
        const decoded = Buffer.from(clean, 'base64').toString('utf8');
        if (decoded.trim().startsWith('{')) return JSON.parse(decoded);
      } catch (e3) {}
    }
  }
  return null;
}

async function auditNotifications() {
  const firebaseProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
  const firebaseDatabaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
  const rawSA = process.env.FIREBASE_SERVICE_ACCOUNT;

  const appOptions: any = { projectId: firebaseProjectId };
  const serviceAccount = parseServiceAccount(rawSA);
  if (serviceAccount) {
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    appOptions.credential = cert(serviceAccount);
  }

  const app = !getApps().length ? initializeApp(appOptions) : getApps()[0];
  const db = getFirestore(app, firebaseDatabaseId);

  console.log("--- AUDIT START ---");
  const notificationsRef = db.collection('notifications');
  const snapshot = await notificationsRef.get();
  
  console.log(`NOTIFICATION_COUNT_RAW = ${snapshot.size}`);

  const driverId = "DRV-TEST"; // Mock driver ID for logic check if needed, but we want to see actual data
  
  // Let's filter like the code does
  const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const role = 'DRIVER';
  
  const filtered = allNotifs.filter((n: any) => {
    // Exact logic from firebaseService.ts:3030-3040
    if (n.userId && n.userId === driverId) return true;
    if (n.role && (n.role === role || n.role === 'ALL')) return true;
    return false;
  });

  console.log(`NOTIFICATION_COUNT_FILTERED (for DRIVER role) = ${filtered.size || (allNotifs.filter((n: any) => n.role === 'DRIVER' || n.role === 'ALL').length)}`);

  console.log("\n--- FIRST 10 RECORDS ---");
  const first10 = allNotifs.slice(0, 10);
  first10.forEach((n: any) => {
    console.log(`ID: ${n.id} | DriverID: ${n.userId || 'N/A'} | Role: ${n.role || 'N/A'} | Title: ${n.title} | CreatedAt: ${n.createdAt?.toDate ? n.createdAt.toDate().toISOString() : n.createdAt}`);
  });

  console.log("--- AUDIT END ---");
}

auditNotifications().catch(console.error);
