// scripts/migrate-to-supabase.js
// สคริปต์ดึงข้อมูลจาก Firebase Firestore เดิม แล้วส่งไปเก็บไว้บน Supabase

const admin = require('firebase-admin');
const { cert } = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const FIREBASE_COLLECTION = 'progress_tracker_db';

async function main() {
  console.log('🔄 Starting data migration from Firestore to Supabase...');

  // 1. Initialize Firebase Admin
  const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ firebase-service-account.json not found in root directory!');
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  admin.initializeApp({
    credential: cert(serviceAccount)
  });
  const firestore = getFirestore();

  // 2. Initialize Supabase
  // Read Supabase credentials from local env or process.env
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set!');
    console.log('💡 Run it like this:');
    console.log('   $env:SUPABASE_URL="https://your-proj.supabase.co"; $env:SUPABASE_SERVICE_ROLE_KEY="your-key"; node scripts/migrate-to-supabase.js');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 3. Fetch all Firestore data documents
  const tables = ['users', 'subjects', 'classrooms', 'assignments', 'scores', 'attendance'];
  const dbData = {};

  console.log('☁️ Fetching data documents from Firestore...');
  for (const table of tables) {
    const snap = await firestore.collection(FIREBASE_COLLECTION).doc(table).get();
    if (snap.exists) {
      dbData[table] = snap.data().list || [];
      console.log(`   Fetched ${dbData[table].length} records from Firestore collection "${table}"`);
    } else {
      dbData[table] = [];
      console.log(`   Firestore collection "${table}" was empty.`);
    }
  }

  // 4. Validate data
  if (!dbData.users || dbData.users.length === 0) {
    console.warn('⚠️ No user data found in Firestore to migrate.');
  }

  // 5. Upload to Supabase
  console.log('☁️ Uploading migrated data payload to Supabase app_state table...');
  const { error } = await supabase
    .from('app_state')
    .upsert({ id: 'main', data: dbData, updated_at: new Date().toISOString() });

  if (error) {
    console.error('❌ Migration failed to write to Supabase:', error);
    process.exit(1);
  }

  // Write a local backup in data/db.json
  const dbDir = path.join(__dirname, '..', 'data');
  const dbFile = path.join(dbDir, 'db.json');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2), 'utf-8');

  console.log('✅ Migration successful! Data is now fully loaded into Supabase.');
  console.log('💾 A local backup was also written to data/db.json.');
}

main().catch(err => {
  console.error('❌ Unexpected error during migration:', err);
  process.exit(1);
});
