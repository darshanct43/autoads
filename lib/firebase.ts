import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp;

export const getDb = () => {
  const firebaseProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
  const firebaseDatabaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';

  if (!getApps().length) {
    const rawSA = process.env.FIREBASE_SERVICE_ACCOUNT;
    const appOptions: any = {
      projectId: firebaseProjectId
    };

    if (rawSA && rawSA.trim()) {
      try {
        const serviceAccount = JSON.parse(rawSA.trim());
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        appOptions.credential = cert(serviceAccount);
      } catch (e) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT", e);
      }
    }
    
    adminApp = initializeApp(appOptions);
  } else {
    adminApp = getApps()[0];
  }
  
  return getFirestore(adminApp, firebaseDatabaseId);
};
