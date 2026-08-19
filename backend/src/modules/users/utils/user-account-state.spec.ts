import { User } from '../entities/user.entity';
import {
  isAccountLocked,
  isEmailVerificationTokenValid,
  isPasswordResetTokenValid,
} from './user-account-state';

describe('user-account-state', () => {
  // Entity columns for the nullable token/date fields are typed non-nullable in
  // TypeScript, so build fixtures from a plain record to simulate nulls at
  // runtime.
  const user = (overrides: Record<string, unknown> = {}): User =>
    ({ ...overrides } as unknown as User);

  describe('isAccountLocked', () => {
    it('returns false when there is no lock', () => {
      expect(isAccountLocked(user({ lockedUntil: null }))).toBe(false);
    });

    it('returns true while the lock is still active', () => {
      const lockedUntil = new Date(Date.now() + 60000);
      expect(isAccountLocked(user({ lockedUntil }))).toBe(true);
    });

    it('returns false after the lock has expired', () => {
      const lockedUntil = new Date(Date.now() - 60000);
      expect(isAccountLocked(user({ lockedUntil }))).toBe(false);
    });
  });

  describe('isEmailVerificationTokenValid', () => {
    it('returns false when no token is set', () => {
      expect(
        isEmailVerificationTokenValid(
          user({
            emailVerificationToken: null,
            emailVerificationExpires: new Date(Date.now() + 60000),
          }),
        ),
      ).toBe(false);
    });

    it('returns false when no expiry is set', () => {
      expect(
        isEmailVerificationTokenValid(
          user({
            emailVerificationToken: 'token',
            emailVerificationExpires: null,
          }),
        ),
      ).toBe(false);
    });

    it('returns true for a token that has not expired', () => {
      expect(
        isEmailVerificationTokenValid(
          user({
            emailVerificationToken: 'token',
            emailVerificationExpires: new Date(Date.now() + 60000),
          }),
        ),
      ).toBe(true);
    });

    it('returns false for an expired token', () => {
      expect(
        isEmailVerificationTokenValid(
          user({
            emailVerificationToken: 'token',
            emailVerificationExpires: new Date(Date.now() - 60000),
          }),
        ),
      ).toBe(false);
    });
  });

  describe('isPasswordResetTokenValid', () => {
    it('returns false when no token is set', () => {
      expect(
        isPasswordResetTokenValid(
          user({
            passwordResetToken: null,
            passwordResetExpires: new Date(Date.now() + 60000),
          }),
        ),
      ).toBe(false);
    });

    it('returns false when no expiry is set', () => {
      expect(
        isPasswordResetTokenValid(
          user({
            passwordResetToken: 'token',
            passwordResetExpires: null,
          }),
        ),
      ).toBe(false);
    });

    it('returns true for a token that has not expired', () => {
      expect(
        isPasswordResetTokenValid(
          user({
            passwordResetToken: 'token',
            passwordResetExpires: new Date(Date.now() + 60000),
          }),
        ),
      ).toBe(true);
    });

    it('returns false for an expired token', () => {
      expect(
        isPasswordResetTokenValid(
          user({
            passwordResetToken: 'token',
            passwordResetExpires: new Date(Date.now() - 60000),
          }),
        ),
      ).toBe(false);
    });
  });
});
