import { act, render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./AuthContext";
import { SESSION_STORAGE_KEY } from "./authStorage";
import { tokenStorage } from "../api/tokens";
import { userApi } from "../api";
import { UserRole } from "../api/types";

vi.mock("../api", () => ({
  userApi: {
    getProfile: vi.fn(),
  },
}));

const mockedGetProfile = vi.mocked(userApi.getProfile);

interface ConsumerHandle {
  context: ReturnType<typeof useAuth> | null;
  rerender: () => void;
}

const AuthConsumer = ({ handle }: { handle: ConsumerHandle }) => {
  handle.context = useAuth();
  handle.rerender = () => {
    /* placeholder – testing-library will re-render on state changes */
  };
  return null;
};

const renderWithConsumer = (): ConsumerHandle => {
  const handle: ConsumerHandle = { context: null, rerender: () => {} };
  render(
    <AuthProvider>
      <AuthConsumer handle={handle} />
    </AuthProvider>,
  );
  return handle;
};

const validToken = (): string => {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60;
  return `a.${btoa(JSON.stringify({ exp }))}.c`;
};

const expiredToken = (): string => {
  const exp = Math.floor(Date.now() / 1000) - 60;
  return `a.${btoa(JSON.stringify({ exp }))}.c`;
};

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    tokenStorage.clearTokens();
    mockedGetProfile.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
    tokenStorage.clearTokens();
  });

  it("logs in with a valid access token and persists only id, firstName, lastName and role", () => {
    const handle = renderWithConsumer();
    act(() => {
      handle.context!.login(validToken(), {
        id: "u1",
        email: "issuer@example.com",
        role: UserRole.ISSUER,
        firstName: "Alice",
        lastName: "Doe",
        organization: "Acme",
        stellarPublicKey: "GA…",
        profilePicture: "data:image/png;base64,xxx",
        metadata: { sensitive: true },
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      });
    });

    expect(handle.context!.user).toEqual({
      id: "u1",
      firstName: "Alice",
      lastName: "Doe",
      role: UserRole.ISSUER,
    });
    expect(handle.context!.isAuthenticated).toBe(true);

    const persisted = JSON.parse(
      localStorage.getItem(SESSION_STORAGE_KEY) ?? "null",
    );
    expect(persisted).toEqual({
      id: "u1",
      firstName: "Alice",
      lastName: "Doe",
      role: UserRole.ISSUER,
    });
    // Sensitive fields must never be written to localStorage. In
    // particular the email address and stellar public key are absent.
    const raw = localStorage.getItem(SESSION_STORAGE_KEY) ?? "";
    expect(raw).not.toContain("stellarPublicKey");
    expect(raw).not.toContain("email");
    expect(raw).not.toContain("issuer@example.com");
    expect(raw).not.toContain("profilePicture");
    expect(raw).not.toContain("organization");
    expect(raw).not.toContain("metadata");
  });

  it("rejects login with an expired token", () => {
    const handle = renderWithConsumer();
    act(() => {
      handle.context!.login(expiredToken(), {
        id: "u1",
        email: "issuer@example.com",
        role: UserRole.ISSUER,
      });
    });

    expect(handle.context!.user).toBeNull();
    expect(handle.context!.isAuthenticated).toBe(false);
  });

  it("clearAuth wipes tokens and stored session", () => {
    const handle = renderWithConsumer();
    act(() => {
      handle.context!.login(validToken(), {
        id: "u1",
        email: "issuer@example.com",
        role: UserRole.ISSUER,
      });
    });
    expect(handle.context!.user).not.toBeNull();

    act(() => {
      handle.context!.clearAuth();
    });
    expect(handle.context!.user).toBeNull();
    expect(handle.context!.isAuthenticated).toBe(false);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(tokenStorage.getAccessToken()).toBeNull();
  });

  it("ignores any pre-existing refreshToken localStorage entry on boot", () => {
    // Simulate an older bundle that wrote `refreshToken` to localStorage.
    // The `tokens.ts` module-level cleanup is what makes this safe; if the
    // cleanup is removed this assertion will fail.
    localStorage.setItem("refreshToken", "legacy-leak");
    render(
      <AuthProvider>
        <AuthConsumer handle={{ context: null, rerender: () => {} }} />
      </AuthProvider>,
    );
    expect(localStorage.getItem("refreshToken")).toBeNull();
  });

  it("loadProfile fetches and caches the full profile on demand", async () => {
    mockedGetProfile.mockResolvedValue({
      id: "u1",
      email: "issuer@example.com",
      role: UserRole.ISSUER,
      firstName: "Alice",
      lastName: "Doe",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02",
    });

    const handle = renderWithConsumer();
    act(() => {
      handle.context!.login(validToken(), {
        id: "u1",
        email: "issuer@example.com",
        role: UserRole.ISSUER,
        firstName: "Alice",
        lastName: "Doe",
      });
    });

    let fetched: ReturnType<typeof handle.context.loadProfile> extends Promise<
      infer R
    >
      ? R
      : never = null;
    await act(async () => {
      fetched = await handle.context!.loadProfile();
    });

    expect(fetched).not.toBeNull();
    expect(fetched?.firstName).toBe("Alice");
    expect(handle.context!.profile?.firstName).toBe("Alice");

    // The profile response must never end up in localStorage: fields that
    // only exist on the full profile (email, picture, …) are absent even
    // though the display name is part of the persisted session.
    const persisted = localStorage.getItem(SESSION_STORAGE_KEY) ?? "";
    expect(persisted).not.toContain("issuer@example.com");
    expect(persisted).not.toContain("email");
    expect(persisted).not.toContain("profilePicture");
    expect(persisted).toContain("Alice");

    // Subsequent calls hit the API only once.
    await act(async () => {
      await handle.context!.loadProfile();
    });
    expect(mockedGetProfile).toHaveBeenCalledTimes(1);
  });

  it("purges the legacy `user` localStorage key on mount", async () => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "old",
        email: "old@example.com",
        role: UserRole.ISSUER,
        stellarPublicKey: "GA…",
      }),
    );
    render(
      <AuthProvider>
        <AuthConsumer handle={{ context: null, rerender: () => {} }} />
      </AuthProvider>,
    );
    await waitFor(() => expect(localStorage.getItem("user")).toBeNull());
  });

  it("isAuthenticated flips to false once the access token expires", () => {
    const handle = renderWithConsumer();
    act(() => {
      handle.context!.login(validToken(), {
        id: "u1",
        email: "issuer@example.com",
        role: UserRole.ISSUER,
      });
    });
    expect(handle.context!.isAuthenticated).toBe(true);

    act(() => {
      tokenStorage.setAccessToken(expiredToken());
    });
    // Force a re-render so the derived value recomputes.
    render(
      <AuthProvider>
        <AuthConsumer handle={handle} />
      </AuthProvider>,
    );
    expect(handle.context!.isAuthenticated).toBe(false);
  });
});
