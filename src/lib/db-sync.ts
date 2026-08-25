// src/lib/db-sync.ts
import { db, isFirebaseActive } from './firebase-admin';
import { DatabaseSchema } from './db';

const DB_COLLECTION = 'progress_tracker_db';

/**
 * Push local database state to Firestore collections in the background
 */
export async function pushToFirebase(data: DatabaseSchema): Promise<void> {
  if (!isFirebaseActive() || !db) {
    return;
  }

  try {
    const batch = db.batch();
    
    // Define the 6 documents representing our tables
    const tables: { id: string; list: any[] }[] = [
      { id: 'users', list: data.users || [] },
      { id: 'subjects', list: data.subjects || [] },
      { id: 'classrooms', list: data.classrooms || [] },
      { id: 'assignments', list: data.assignments || [] },
      { id: 'scores', list: data.scores || [] },
      { id: 'attendance', list: data.attendance || [] }
    ];

    tables.forEach(table => {
      const docRef = db!.collection(DB_COLLECTION).doc(table.id);
      batch.set(docRef, { list: table.list, updated_at: new Date().toISOString() });
    });

    await batch.commit();
    console.log('☁️ Successfully synced local database state to Firebase Firestore!');
  } catch (error) {
    console.error('❌ Failed to push database state to Firebase Firestore:', error);
  }
}

/**
 * Fetch database state from Firestore and reconstruct DatabaseSchema
 */
export async function pullFromFirebase(): Promise<DatabaseSchema | null> {
  if (!isFirebaseActive() || !db) {
    console.log('🔌 Firebase is not active. Using offline database.');
    return null;
  }

  try {
    console.log('☁️ Fetching fresh database state from Firebase Firestore...');
    const usersSnap = await db.collection(DB_COLLECTION).doc('users').get();
    const subjectsSnap = await db.collection(DB_COLLECTION).doc('subjects').get();
    const classroomsSnap = await db.collection(DB_COLLECTION).doc('classrooms').get();
    const assignmentsSnap = await db.collection(DB_COLLECTION).doc('assignments').get();
    const scoresSnap = await db.collection(DB_COLLECTION).doc('scores').get();
    const attendanceSnap = await db.collection(DB_COLLECTION).doc('attendance').get();

    // Check if at least the users document exists
    if (!usersSnap.exists) {
      console.log('☁️ Firestore database is empty or not initialized.');
      return null;
    }

    const schema: DatabaseSchema = {
      users: usersSnap.data()?.list || [],
      subjects: subjectsSnap.data()?.list || [],
      classrooms: classroomsSnap.data()?.list || [],
      assignments: assignmentsSnap.data()?.list || [],
      scores: scoresSnap.data()?.list || [],
      attendance: attendanceSnap.data()?.list || []
    };

    console.log('☁️ Successfully pulled and assembled database from Firestore.');
    return schema;
  } catch (error) {
    console.error('❌ Failed to pull database from Firebase Firestore:', error);
    return null;
  }
}
