// scripts/sync-pull.js
const admin = require('firebase-admin');
const { cert } = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');
const DB_COLLECTION = 'progress_tracker_db';

// Ensure data folder exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const SALT = 'student-tracker-secret-salt-key-98765';

// Simple password hashing to match app encryption
function hashPassword(password) {
  return crypto.createHmac('sha256', SALT).update(password).digest('hex');
}

// Default seed database (Only Admin)
function getSeedData() {
  return {
    users: [
      {
        id: 'user-admin',
        student_id: null,
        username: 'admin',
        passwordHash: hashPassword('password123'),
        role: 'admin',
        first_name: 'สมศรี',
        last_name: 'รักการสอน',
        classroom: null,
        status: 'active',
        created_at: new Date().toISOString()
      }
    ],
    subjects: [],
    classrooms: [],
    assignments: [],
    scores: [],
    attendance: []
  };
}

async function run() {
  console.log('🔄 Running pre-startup database sync...');

  let dbInstance = null;
  let isFirebaseConfigured = false;

  // Initialize Firebase Admin SDK
  try {
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      console.log('🔥 Found firebase-service-account.json, loading Cloud configuration...');
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: cert(serviceAccount)
      });
      isFirebaseConfigured = true;
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      console.log('🔥 Found environment credentials, loading Cloud configuration...');
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        })
      });
      isFirebaseConfigured = true;
    } else {
      console.log('🔌 Firebase credentials not configured. Running offline.');
    }

    if (isFirebaseConfigured) {
      dbInstance = getFirestore();
    }
  } catch (err) {
    console.error('❌ Firebase Admin initialization error:', err);
  }

  // Handle sync logic
  if (isFirebaseConfigured && dbInstance) {
    try {
      console.log('☁️ Fetching data documents from Firebase Firestore...');
      
      const tables = ['users', 'subjects', 'classrooms', 'assignments', 'scores', 'attendance'];
      const data = {};
      let docCount = 0;

      for (const table of tables) {
        const snap = await dbInstance.collection(DB_COLLECTION).doc(table).get();
        if (snap.exists) {
          data[table] = snap.data().list || [];
          docCount++;
        } else {
          data[table] = [];
        }
      }

      // If database documents are missing or empty on Firestore, initialize cloud DB
      if (docCount === 0 || !data.users || data.users.length === 0) {
        console.log('☁️ Cloud database is empty. Initializing with default seed...');
        const seeded = getSeedData();
        
        // Write to local json
        fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');

        // Push to Cloud
        const batch = dbInstance.batch();
        tables.forEach(table => {
          const docRef = dbInstance.collection(DB_COLLECTION).doc(table);
          batch.set(docRef, { list: seeded[table] || [], updated_at: new Date().toISOString() });
        });
        await batch.commit();
        console.log('☁️ Successfully initialized Cloud Firestore with default seed database.');
      } else {
        // Save cloud state to local db.json
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log('☁️ Successfully synced Firestore data to local cache.');
      }
    } catch (err) {
      console.error('❌ Failed to pull data from Firebase Firestore:', err);
      fallbackToLocalSeed();
    }
  } else {
    fallbackToLocalSeed();
  }
  
  console.log('✅ Sync process completed.');
}

function fallbackToLocalSeed() {
  if (!fs.existsSync(DB_FILE)) {
    console.log('💾 Local db.json not found. Creating a fresh seed database offline...');
    const seed = getSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
  } else {
    console.log('💾 Local db.json found. Running with existing cache database.');
  }
}

run().catch(console.error);
