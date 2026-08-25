// src/lib/seed.ts
import { User } from './db';
import { hashPassword } from './hash';

export default function getSeededData() {
  const users: User[] = [];
  
  // มีเพียงบัญชีอาจารย์ (Admin) สำหรับใช้ล็อกอินเริ่มต้นระบบจริง
  users.push({
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
  });

  return {
    users,
    subjects: [],
    classrooms: [],
    assignments: [],
    scores: [],
    attendance: []
  };
}
