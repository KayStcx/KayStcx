import type { User } from "../api/types";
import { UserRole } from "../api/types";

/**
 * Minimal projection of `User` that is safe to persist to localStorage.
 *
 * The backend's full user record contains fields that should never be cached
 * in plain JSON in the browser (stellar public key, email, phone,
 * organisation, metadata, etc.). The session only needs the fields required
 * for routing, API calls and the role-based UI guards. Anything else (email,
 * profile picture, etc.) is fetched on demand via `/users/profile` and
 * lives in memory only.
 */
export type StoredUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

/**
 * Storage key used for the persisted auth session. Picked once so we can
 * migrate older keys safely without scattering string literals across the
 * codebase.
 */
export const SESSION_STORAGE_KEY = "kaystcx.auth.session";

/**
 * Old storage key from the previous implementation that persisted the full
 * User object. We read-and-clear it on boot so that no legacy data remains
 * in localStorage after the upgrade.
 */
export const LEGACY_USER_STORAGE_KEY = "user";

/**
 * Build a {@link StoredUser} from a full User response, dropping every
 * field that we don't actually need at the app shell — including the email
 * address, which must never be cached in localStorage.
 */
export function toSessionUser(user: User): StoredUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}

/**
 * Read the persisted {@link StoredUser} from localStorage. Returns `null`
 * when nothing is stored or when the stored payload is malformed (for
 * example when a tampered value fails the shape guard).
 */
export function readSessionUser(): StoredUser | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isSessionUser(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persist the supplied session user to localStorage. Throws are swallowed
 * so a transient storage failure cannot crash the auth flow.
 */
export function writeSessionUser(user: StoredUser | null): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (!user) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  } catch {
    /* Storage failures are non-fatal for the auth flow. */
  }
}

/**
 * Drop any session-shaped data, including the legacy `user` key from the
 * previous implementation.
 */
export function clearAuthStorage(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Migration helper: removes the legacy `user` storage key that the previous
 * AuthContext implementation wrote. Called once on boot. If the legacy key
 * was the only thing keeping a user "logged in", the absence of a session
 * will route them to the login screen — preferable to leaking the full
 * user record any longer than necessary.
 */
export function purgeLegacyUserStorage(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const USER_ROLES: ReadonlyArray<string> = [
  UserRole.ADMIN,
  UserRole.ISSUER,
  UserRole.RECIPIENT,
  UserRole.VERIFIER,
];

function isSessionUser(value: unknown): value is StoredUser {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.firstName === "string" &&
    typeof candidate.lastName === "string" &&
    typeof candidate.role === "string" &&
    USER_ROLES.includes(candidate.role)
  );
}
