// src/lib/auth-token.ts

const JWT_SECRET = process.env.JWT_SECRET || 'progress-tracker-super-secret-key-13579';

export interface TokenPayload {
  id: string;
  student_id: string | null;
  username: string;
  role: 'admin' | 'student';
  first_name: string;
  last_name: string;
  classroom: string | null;
}

// Pure JS/TS SHA-256 implementation (compatible with Edge Runtime & Node.js)
function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256(str: string): string {
  const s = str + '\x80';
  const l = s.length;
  
  // SHA-256 constants
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  
  const wordsCount = ((l + 8) >> 6) + 1;
  const messageBytes = wordsCount * 16;
  const w = new Int32Array(messageBytes);
  
  for (let i = 0; i < l; i++) {
    w[i >> 2] |= s.charCodeAt(i) << (24 - (i % 4) * 8);
  }
  w[l >> 2] |= 0x80 << (24 - (l % 4) * 8);
  w[messageBytes - 1] = l * 8;
  
  const H = new Int32Array(8);
  H.set(hash);
  
  const W = new Int32Array(64);
  
  for (let i = 0; i < messageBytes; i += 16) {
    for (let j = 0; j < 16; j++) {
      W[j] = w[i + j];
    }
    for (let j = 16; j < 64; j++) {
      const s0 = (rightRotate(W[j - 15], 7) ^ rightRotate(W[j - 15], 18) ^ (W[j - 15] >>> 3));
      const s1 = (rightRotate(W[j - 2], 17) ^ rightRotate(W[j - 2], 19) ^ (W[j - 2] >>> 10));
      W[j] = (W[j - 16] + s0 + W[j - 7] + s1) | 0;
    }
    
    let [a, b, c, d, e, f, g, h0] = H;
    
    for (let j = 0; j < 64; j++) {
      const s1 = (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h0 + s1 + ch + K[j] + W[j]) | 0;
      const s0 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;
      
      h0 = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h0) | 0;
  }
  
  const result = [];
  for (let i = 0; i < 8; i++) {
    result.push(H[i].toString(16).padStart(8, '0'));
  }
  
  return result.join('');
}

export function signToken(payload: TokenPayload, expiresInMinutes = 120): string {
  const expiry = Date.now() + expiresInMinutes * 60 * 1000;
  const data = JSON.stringify({ payload, expiry });
  
  // Base64 encode using native functions compatible in Node & Edge
  const encodedData = typeof btoa !== 'undefined' 
    ? btoa(encodeURIComponent(data)) 
    : Buffer.from(data).toString('base64');
  
  // Sign data with our secret using pure-JS SHA-256
  const signature = sha256(encodedData + JWT_SECRET);
    
  return `${encodedData}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  if (!token) return null;
  
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  
  const [encodedData, signature] = parts;
  
  // Verify signature
  const expectedSignature = sha256(encodedData + JWT_SECRET);
    
  if (signature !== expectedSignature) return null;
  
  try {
    const decodedStr = typeof atob !== 'undefined'
      ? decodeURIComponent(atob(encodedData))
      : Buffer.from(encodedData, 'base64').toString('utf-8');
      
    const decoded = JSON.parse(decodedStr);
    
    // Check expiration
    if (Date.now() > decoded.expiry) {
      return null;
    }
    
    return decoded.payload as TokenPayload;
  } catch (error) {
    return null;
  }
}
