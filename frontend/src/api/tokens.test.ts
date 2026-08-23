import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStorage } from "./tokens";

/**
 * Issue #43 (frontend "security"): a refresh token must never be stored in,
 * or exposed through, client-side storage — a single XSS payload could
 * otherwise read a long-lived session out of `localStorage`. These specs
 * pin that contract so any regression that re-adds refresh-token accessors
 * or writes a refresh token to `localStorage` is caught by CI.
 */
describe("tokenStorage (issue #43)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("exposes access-token helpers but no refresh-token accessors", () => {
    expect(tokenStorage.getAccessToken).toBeTypeOf("function");
    expect(tokenStorage.setAccessToken).toBeTypeOf("function");
    expect(tokenStorage.clearTokens).toBeTypeOf("function");
    expect(tokenStorage.hasAccessToken).toBeTypeOf("function");

    const asRecord = tokenStorage as unknown as Record<string, unknown>;
    expect(asRecord.getRefreshToken).toBeUndefined();
    expect(asRecord.setRefreshToken).toBeUndefined();
  });

  it("persists the access token and reports it", () => {
    tokenStorage.setAccessToken("access-123");
    expect(tokenStorage.getAccessToken()).toBe("access-123");
    expect(tokenStorage.hasAccessToken()).toBe(true);
  });

  it("clearTokens removes the access token and any legacy refreshToken entry", () => {
    tokenStorage.setAccessToken("access-123");
    localStorage.setItem("refreshToken", "legacy-leak");

    tokenStorage.clearTokens();

    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });

  it("never writes a refresh token to localStorage", () => {
    tokenStorage.setAccessToken("access-123");
    tokenStorage.clearTokens();

    const keys = Object.keys(localStorage);
    expect(
      keys.some((key) => key.toLowerCase().includes("refresh")),
    ).toBe(false);
  });

  it("purges a legacy refreshToken entry left by older bundles on module load", async () => {
    localStorage.setItem("refreshToken", "legacy-leak");

    vi.resetModules();
    await import("./tokens");

    expect(localStorage.getItem("refreshToken")).toBeNull();
  });
});
