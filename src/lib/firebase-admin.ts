// src/lib/firebase-admin.ts
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let dbInstance: any = null;
let isFirebaseInitialized = false;

try {
  if (getApps().length === 0) {
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      console.log('🔥 Found firebase-service-account.json, initializing Firebase Admin...');
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount)
      });
      isFirebaseInitialized = true;
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      console.log('🔥 Found Firebase environment variables, initializing Firebase Admin...');
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        })
      });
      isFirebaseInitialized = true;
    } else {
      console.warn('⚠️ Firebase credentials not configured. System is running in Local Offline Cache mode.');
    }
  } else {
    isFirebaseInitialized = true;
  }

  if (isFirebaseInitialized || getApps().length > 0) {
    dbInstance = getFirestore();
    isFirebaseInitialized = true;
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error);
}

export const db = dbInstance;
export const isFirebaseActive = () => isFirebaseInitialized;
