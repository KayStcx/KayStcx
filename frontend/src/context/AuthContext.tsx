/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { User, userApi } from "../api";
import { tokenStorage } from "../api/tokens";
import type { SessionUser } from "./authStorage";
import {
  clearAuthStorage,
  purgeLegacyUserStorage,
  readSessionUser,
  toSessionUser,
  writeSessionUser,
} from "./authStorage";

const TOKEN_CHECK_INTERVAL_MS = 5 * 60 * 1000;

interface AuthContextValue {
  /**
   * Minimal, non-sensitive user identity that is safe to persist to
   * localStorage. Use this for routing, role guards and to fire API calls.
   * When you need anything else (first/last name, profile picture, …)
   * reach for {@link profile}.
   */
  user: SessionUser | null;
  /**
   * Full user profile loaded on demand from `/users/profile`. Starts at
   * `null` and is populated by {@link loadProfile}. Anything sensitive
   * stays in memory; nothing here is written to localStorage.
   */
  profile: User | null;
  setUser: (user: SessionUser | null) => void;
  setProfile: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  /**
   * Fetch the full user profile from the backend. Idempotent: returns the
   * cached profile when one is already loaded.
   */
  loadProfile: () => Promise<User | null>;
  clearAuth: () => void;
  login: (accessToken: string, refreshToken: string, user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUserState] = useState<SessionUser | null>(() => {
    purgeLegacyUserStorage();
    return readSessionUser();
  });
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkTokenExpiration = () => {
      const accessToken = tokenStorage.getAccessToken();
      if (accessToken && isTokenExpired(accessToken)) {
        console.warn("Access token expired, clearing authentication state");
        tokenStorage.clearTokens();
        clearAuthStorage();
        setUserState(null);
        setProfile(null);
      } else if (!accessToken) {
        clearAuthStorage();
        setUserState(null);
        setProfile(null);
      }
      setIsLoading(false);
    };

    checkTokenExpiration();
    const interval = setInterval(checkTokenExpiration, TOKEN_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      writeSessionUser(user);
    } else {
      writeSessionUser(null);
      tokenStorage.clearTokens();
      // If the session is gone the in-memory profile is also stale.
      setProfile(null);
    }
  }, [user]);

  const setUser = useCallback((nextUser: SessionUser | null) => {
    setUserState(nextUser);
  }, []);

  const loadProfile = useCallback(async (): Promise<User | null> => {
    if (!user) return null;
    if (profile) return profile;
    try {
      const fresh = await userApi.getProfile();
      setProfile(fresh);
      return fresh;
    } catch (err) {
      console.warn("Failed to load user profile:", err);
      return null;
    }
  }, [user, profile]);

  const clearAuth = useCallback(() => {
    setUserState(null);
    setProfile(null);
    tokenStorage.clearTokens();
    clearAuthStorage();
  }, []);

  const login = useCallback(
    (accessToken: string, refreshToken: string, nextUser: User) => {
      if (isTokenExpired(accessToken)) {
        console.error("Attempted to login with expired token");
        return;
      }
      tokenStorage.setAccessToken(accessToken);
      tokenStorage.setRefreshToken(refreshToken);
      setUserState(toSessionUser(nextUser));
      // Reset the cached profile so a subsequent loadProfile fetches the
      // freshly authenticated user.
      setProfile(null);
    },
    [],
  );

  const accessToken = tokenStorage.getAccessToken();
  const isAuthenticated =
    !!user && !!accessToken && !isTokenExpired(accessToken);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      setUser,
      setProfile,
      isAuthenticated,
      isLoading,
      loadProfile,
      clearAuth,
      login,
    }),
    [user, profile, isAuthenticated, isLoading, loadProfile, clearAuth, login, setUser],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Decodes the `exp` claim from a JWT and checks if it has passed. Treats
 * malformed tokens as expired.
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as {
      exp?: number;
    };
    if (typeof payload.exp !== "number") return true;
    return payload.exp < Date.now() / 1000;
  } catch {
    return true;
  }
}
