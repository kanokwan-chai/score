// src/lib/hash.ts
import crypto from 'crypto';

const SALT = 'student-tracker-secret-salt-key-98765';

export function hashPassword(password: string): string {
  return crypto.createHmac('sha256', SALT).update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
