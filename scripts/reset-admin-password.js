// scripts/reset-admin-password.js
// รีเซ็ตรหัสผ่านแอดมินใน Firestore ให้ตรงกับ password123

const admin = require('firebase-admin');
const { cert } = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const SALT = 'student-tracker-secret-salt-key-98765';
const DB_COLLECTION = 'progress_tracker_db';

function hashPassword(password) {
  return crypto.createHmac('sha256', SALT).update(password).digest('hex');
}

async function main() {
  // Load service account
  const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ firebase-service-account.json not found!');
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  // Init Firebase
  admin.initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  const newHash = hashPassword('password123');
  console.log('🔑 New password hash:', newHash);

  // Update admin user in Firestore - collection: progress_tracker_db, doc: users, field: list
  const userRef = db.collection(DB_COLLECTION).doc('users');
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    console.error(`❌ "${DB_COLLECTION}/users" document not found in Firestore!`);
    process.exit(1);
  }

  const data = snapshot.data();
  const users = data.list || [];

  const adminIndex = users.findIndex(u => u.username === 'admin');
  if (adminIndex === -1) {
    console.error('❌ Admin user not found in Firestore!');
    process.exit(1);
  }

  const oldHash = users[adminIndex].passwordHash;
  users[adminIndex].passwordHash = newHash;

  await userRef.update({ list: users, updated_at: new Date().toISOString() });

  console.log('✅ Admin password reset successful!');
  console.log('   Old hash:', oldHash);
  console.log('   New hash:', newHash);
  console.log('   Username: admin | Password: password123');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

