import jwt from 'jsonwebtoken';
import * as crypto from 'node:crypto';

export interface JWTPayload {
  userId: string;
  email: string;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly hashSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'dev_secret_keys_123';
    this.hashSecret = process.env.HASH_SECRET || 'dev_hash_secret_456';
  }

  generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateMagicLinkHash(email: string, ts: number): string {
    const data = `${email.toLowerCase()}:${ts}`;
    return crypto.createHmac('sha256', this.hashSecret).update(data).digest('hex');
  }

  verifyMagicLinkHash(email: string, ts: string, hash: string): boolean {
    // 1. Check for integrity
    const expectedHash = this.generateMagicLinkHash(email, parseInt(ts));
    if (hash !== expectedHash) {
      console.log('Hash mismatch for stateless magic link');
      return false;
    }

    // 2. Check for expiry (10 minutes)
    const timestamp = parseInt(ts);
    const now = Date.now();
    const tenMinutesInMs = 10 * 60 * 1000;

    if (now - timestamp > tenMinutesInMs) {
      console.log('Stateless magic link expired');
      return false;
    }

    return true;
  }

  generateJWT(payload: JWTPayload): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '7d' });
  }
}
