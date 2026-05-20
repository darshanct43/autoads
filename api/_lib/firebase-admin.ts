import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    } else {
      console.warn("Firebase Admin initialized without explicit credentials. Ensure you're in a supported environment.");
      admin.initializeApp();
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

const getDb = () => {
  try {
    const dbId = process.env.FIRESTORE_DATABASE_ID || '(default)';
    // Correct way to get a named database in firebase-admin
    return getFirestore(admin.apps[0], dbId);
  } catch (e) {
    return admin.firestore();
  }
};
export const dbAdm = getDb();
export const authAdm = admin.auth();
export { admin };
