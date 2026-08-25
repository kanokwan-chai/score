import fs from 'fs';
import path from 'path';
import getSeededData from './seed';
import { createClient } from '@supabase/supabase-js';

export interface User {
  id: string;
  student_id: string | null; // null for admin
  username: string;
  passwordHash: string;
  role: 'admin' | 'student';
  first_name: string;
  last_name: string;
  classroom: string | null; // null for admin
  status: 'pending' | 'active';
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface Classroom {
  id: string;
  name: string;
}

export interface Assignment {
  id: string;
  subject_id: string;
  title: string;
  type: 'Quiz' | 'Assignment' | 'Homework' | 'Lab' | 'Project' | 'Midterm' | 'Final';
  category: 'assignment' | 'quiz' | 'behavior' | 'final'; // added category
  full_score: number;
  keep_score: number;
  due_date: string;
  classroom: string; // target classroom (e.g., "ม.6/1")
}

export interface Score {
  id: string;
  assignment_id: string;
  student_id: string; // matches User.id of student
  raw_score: number;
  calculated_score: number;
  feedback: string;
  note: string; // admin private note
  created_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  subject_id: string;
  classroom: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'leave_business' | 'leave_sick';
  created_at: string;
}

export interface DatabaseSchema {
  users: User[];
  subjects: Subject[];
  classrooms: Classroom[];
  assignments: Assignment[];
  scores: Score[];
  attendance: Attendance[];
}

const DB_DIR = process.env.VERCEL 
  ? '/tmp/data' 
  : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Lazy initialization of Supabase client to prevent build-time crashes when env vars are missing
let supabaseInstance: any = null;
function getSupabase() {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️ Supabase credentials are not configured yet. Using local fallback.');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseInstance;
}

// Fallback helper to read/write local db file
function getFallbackDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const fileData = fs.readFileSync(DB_FILE, 'utf-8').trim();
      if (fileData) {
        return JSON.parse(fileData) as DatabaseSchema;
      }
    }
  } catch (e) {
    console.error('⚠️ Failed to read local fallback DB:', e);
  }
  return getSeededData();
}

// Empty no-op function to avoid breaking existing patched API routes
export async function ensureDbSynced(): Promise<void> {
  // No-op: Supabase is synced directly on every read/write call.
}

// Read database from Supabase (falls back to local file if credentials not set)
export async function readDb(): Promise<DatabaseSchema> {
  if (!supabaseUrl || !supabaseServiceKey) {
    return getFallbackDb();
  }

  try {
    const client = getSupabase();
    const { data, error } = await client
      .from('app_state')
      .select('data')
      .eq('id', 'main')
      .single();

    if (error) {
      console.error('⚠️ Failed to read database from Supabase, returning local fallback:', error);
      return getFallbackDb();
    }

    const parsed = data.data as DatabaseSchema;
    
    // Safety checks for older database schemas
    if (!parsed.attendance) parsed.attendance = [];
    if (!parsed.users) parsed.users = [];

    return parsed;
  } catch (error) {
    console.error('⚠️ Supabase query crash, returning local fallback:', error);
    return getFallbackDb();
  }
}

// Write database to Supabase (and local backup file)
export async function writeDb(data: DatabaseSchema): Promise<void> {
  // 1. Write local backup
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('⚠️ Failed to write local fallback database file:', error);
  }

  // 2. Upload to Supabase if configured
  if (!supabaseUrl || !supabaseServiceKey) {
    return;
  }

  try {
    const client = getSupabase();
    const { error } = await client
      .from('app_state')
      .upsert({ id: 'main', data, updated_at: new Date().toISOString() });

    if (error) {
      console.error('⚠️ Failed to write data to Supabase:', error);
      throw new Error('Database write failure on Supabase');
    }
    console.log('☁️ Successfully synced and saved database state to Supabase!');
  } catch (error) {
    console.error('⚠️ Supabase upload crash:', error);
    throw error;
  }
}

// Helper methods for quick access
export async function getUsers() { return (await readDb()).users; }
export async function saveUsers(users: User[]): Promise<void> {
  const db = await readDb();
  db.users = users;
  await writeDb(db);
}

export async function getSubjects() { return (await readDb()).subjects; }
export async function saveSubjects(subjects: Subject[]): Promise<void> {
  const db = await readDb();
  db.subjects = subjects;
  await writeDb(db);
}

export async function getClassrooms() { return (await readDb()).classrooms; }
export async function saveClassrooms(classrooms: Classroom[]): Promise<void> {
  const db = await readDb();
  db.classrooms = classrooms;
  await writeDb(db);
}

export async function getAssignments() { return (await readDb()).assignments; }
export async function saveAssignments(assignments: Assignment[]): Promise<void> {
  const db = await readDb();
  db.assignments = assignments;
  await writeDb(db);
}

export async function getScores() { return (await readDb()).scores; }
export async function saveScores(scores: Score[]): Promise<void> {
  const db = await readDb();
  db.scores = scores;
  await writeDb(db);
}

export async function getAttendance() { return (await readDb()).attendance || []; }
export async function saveAttendance(attendance: Attendance[]): Promise<void> {
  const db = await readDb();
  db.attendance = attendance;
  await writeDb(db);
}
