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
    it("keeps only id, email and role", () => {
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
        email: "alice@example.com",
        role: UserRole.ISSUER,
      });
      expect(Object.keys(session).sort()).toEqual(["email", "id", "role"]);
    });
  });

  describe("read/write/clear", () => {
    it("round-trips a session user through localStorage", () => {
      const user = {
        id: "u2",
        email: "bob@example.com",
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

      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          id: "u4",
          email: "x@example.com",
          role: "observer", // not a valid UserRole
        }),
      );
      expect(readSessionUser()).toBeNull();
    });

    it("writes null by removing the key", () => {
      writeSessionUser({
        id: "u5",
        email: "k@x.com",
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
        email: "c@x.com",
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
