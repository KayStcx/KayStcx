import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

/**
 * Cryptography utility helpers
 */
export class CryptoUtils {
  /**
   * Hashes a password using bcryptjs
   * @param password - Plain text password to hash
   * @param rounds - Number of salt rounds (default: 12)
   */
  static async hashPassword(password: string, rounds: number = 12): Promise<string> {
    return bcrypt.hash(password, rounds);
  }

  /**
   * Compares a plain text password with a hashed password
   * @param password - Plain text password
   * @param hash - Hashed password to compare against
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates a random string token (useful for reset tokens, etc)
   * @param length - Length of the token (default: 32)
   */
  static generateToken(length: number = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Generates a random numeric code (useful for OTP, verification codes)
   * @param length - Length of the code (default: 6)
   */
  static generateNumericCode(length: number = 6): string {
    return Math.random()
      .toString()
      .substring(2, 2 + length)
      .padEnd(length, '0');
  }

  /**
   * Hashes data using SHA256
   */
  static sha256Hash(data: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Creates an HMAC signature
   */
  static createHMAC(data: string, secret: string): string {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Verifies an HMAC signature
   */
  static verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createHMAC(data, secret);
    return expectedSignature === signature;
  }
}
