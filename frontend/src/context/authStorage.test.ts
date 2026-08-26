import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LEGACY_USER_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  clearAuthStorage,
  purgeLegacyUserStorage,
  readSessionUser,
  toSessionUser,
  writeSessionUser,
} from "./authStorage";
import { UserRole } from "../api/types";

describe("authStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("toSessionUser", () => {
    it("keeps only id, firstName, lastName and role", () => {
      const session = toSessionUser({
        id: "u1",
        email: "alice@example.com",
        role: UserRole.ISSUER,
        firstName: "Alice",
        lastName: "Doe",
        organization: "Acme",
        phone: "555-1234",
        profilePicture: "data:image/png;base64,xxx",
        stellarPublicKey: "GA…",
        metadata: { sensitive: true },
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
        username: "alicedoe",
      });

      expect(session).toEqual({
        id: "u1",
        firstName: "Alice",
        lastName: "Doe",
        role: UserRole.ISSUER,
      });
      expect(Object.keys(session).sort()).toEqual([
        "firstName",
        "id",
        "lastName",
        "role",
      ]);
    });

    it("never includes email or other sensitive fields", () => {
      const session = toSessionUser({
        id: "u1",
        email: "alice@example.com",
        role: UserRole.ISSUER,
        firstName: "Alice",
        lastName: "Doe",
        stellarPublicKey: "GA…",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      });

      expect(session).not.toHaveProperty("email");
      expect(session).not.toHaveProperty("stellarPublicKey");
      const serialized = JSON.stringify(session);
      expect(serialized).not.toContain("alice@example.com");
      expect(serialized).not.toContain("stellarPublicKey");
    });
  });

  describe("read/write/clear", () => {
    it("round-trips a session user through localStorage", () => {
      const user = {
        id: "u2",
        firstName: "Bob",
        lastName: "Lee",
        role: UserRole.RECIPIENT,
      };
      writeSessionUser(user);
      expect(readSessionUser()).toEqual(user);
    });

    it("rejects malformed payloads", () => {
      localStorage.setItem(SESSION_STORAGE_KEY, "{not json}");
      expect(readSessionUser()).toBeNull();

      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ id: "u3" }),
      );
      expect(readSessionUser()).toBeNull();
    });

    it("rejects a tampered role value", () => {
      // A session whose role was rewritten to an unknown value must be
      // discarded so a tampered payload can never pass a stale role into
      // the auth guard.
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          id: "u4",
          firstName: "Carol",
          lastName: "Zed",
          role: "superadmin", // not a valid UserRole
        }),
      );
      expect(readSessionUser()).toBeNull();

      // A payload with a structurally valid role but tampered id is
      // rejected too.
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          id: 42,
          firstName: "Carol",
          lastName: "Zed",
          role: UserRole.ADMIN,
        }),
      );
      expect(readSessionUser()).toBeNull();
    });

    it("writes null by removing the key", () => {
      writeSessionUser({
        id: "u5",
        firstName: "Dave",
        lastName: "Roe",
        role: UserRole.ADMIN,
      });
      expect(localStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
      writeSessionUser(null);
      expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it("clearAuthStorage wipes the session and legacy keys", () => {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({}));
      localStorage.setItem(LEGACY_USER_STORAGE_KEY, "anything");
      clearAuthStorage();
      expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(LEGACY_USER_STORAGE_KEY)).toBeNull();
    });
  });

  describe("purgeLegacyUserStorage", () => {
    it("only removes the legacy user key", () => {
      const session = {
        id: "u6",
        firstName: "Eve",
        lastName: "Woe",
        role: UserRole.VERIFIER,
      };
      writeSessionUser(session);
      localStorage.setItem(LEGACY_USER_STORAGE_KEY, "old");
      purgeLegacyUserStorage();
      expect(localStorage.getItem(LEGACY_USER_STORAGE_KEY)).toBeNull();
      expect(readSessionUser()).toEqual(session);
    });
  });
});
