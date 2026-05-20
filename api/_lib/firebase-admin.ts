import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (admin.apps.length > 0) return admin.apps[0];

  try {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (sa && sa.startsWith('{')) {
      const serviceAccount = JSON.parse(sa);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });
    } else {
      const projectId = sa || process.env.FIREBASE_PROJECT_ID;
      if (projectId) {
        return admin.initializeApp({
          projectId: projectId
        });
      } else {
        return admin.initializeApp();
      }
    }
  } catch (error) {
    console.warn("Firebase Admin fallback initialization");
    try {
      return admin.initializeApp();
    } catch (finalError) {
      console.error("Firebase Admin initialization failed completely", finalError);
      throw finalError;
    }
  }
}

export const dbAdm = {
  collection: (name: string) => {
    const app = getAdminApp();
    const dbId = process.env.FIRESTORE_DATABASE_ID || '(default)';
    return getFirestore(app, dbId).collection(name);
  },
  doc: (path: string) => {
    const app = getAdminApp();
    const dbId = process.env.FIRESTORE_DATABASE_ID || '(default)';
    return getFirestore(app, dbId).doc(path);
  }
} as any;

export const authAdm = {
  getUser: (uid: string) => getAdminApp().auth().getUser(uid),
  verifyIdToken: (token: string) => getAdminApp().auth().verifyIdToken(token)
} as any;

export { admin };
