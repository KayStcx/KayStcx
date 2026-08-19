import { User } from '../entities/user.entity';

/**
 * User account-state helpers.
 *
 * These checks previously lived as methods on the `User` entity. They are kept
 * here as pure functions so the entity remains a plain data model and the
 * business rules can be tested in isolation.
 */

/**
 * Returns true when the account is currently locked out (i.e. `lockedUntil` is
 * set and is still in the future).
 */
export function isAccountLocked(user: User): boolean {
  if (!user.lockedUntil) {
    return false;
  }
  return new Date() < user.lockedUntil;
}

/**
 * Returns true when the user has an email verification token that has not yet
 * expired.
 */
export function isEmailVerificationTokenValid(user: User): boolean {
  if (!user.emailVerificationToken || !user.emailVerificationExpires) {
    return false;
  }
  return new Date() < user.emailVerificationExpires;
}

/**
 * Returns true when the user has a password reset token that has not yet
 * expired.
 */
export function isPasswordResetTokenValid(user: User): boolean {
  if (!user.passwordResetToken || !user.passwordResetExpires) {
    return false;
  }
  return new Date() < user.passwordResetExpires;
}
