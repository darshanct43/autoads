import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = require('./serviceAccountKey.json'); // wait, I don't have the serviceAccountKey.json 
