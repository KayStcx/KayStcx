import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  username: string;
  email: string;
  role: "user" | "verifier" | "issuer" | "admin";
}

interface AuthContextType {
  user: User | null;
  role: string;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    validateAndFetchUser();
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "authUpdate" || e.key === "token") {
        validateAndFetchUser();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  async function validateAndFetchUser() {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn(
          "validateAndFetchUser: unexpected status",
          response.status,
        );
        throw new Error("Invalid token");
      }

      const text = await response.text();
      if (!text) throw new Error("Empty response body from /auth/me");
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn(
          "validateAndFetchUser: failed to parse JSON",
          e,
          "body:",
          text,
        );
        throw e;
      }

      const normalizedUser = {
        ...data.user,
        role: normalizeRole(data.user.role),
      };

      setUser(normalizedUser);
    } catch (error) {
      console.error("Auth validation failed:", error);
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const text = await response.text();
        let errMsg = "Login failed";
        try {
          const parsed = text ? JSON.parse(text) : null;
          errMsg = parsed?.message || parsed?.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const bodyText = await response.text();
      let data: any = null;
      if (bodyText) {
        try {
          data = JSON.parse(bodyText);
        } catch (e) {
          console.warn(
            "login: failed to parse JSON body",
            e,
            "body:",
            bodyText,
          );
        }
      }

      if (data && data.token) {
        localStorage.setItem("token", data.token);
      } else {
        console.warn(
          "login: no token in response, backend may return cookies instead",
        );
      }

      localStorage.setItem("authUpdate", String(Date.now()));

      await validateAndFetchUser();
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("auth");
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");

    localStorage.setItem("authUpdate", String(Date.now()));

    setUser(null);

    fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  }

  async function refreshUser() {
    await validateAndFetchUser();
  }

  function normalizeRole(role: any): "user" | "verifier" | "issuer" | "admin" {
    const normalized = String(role).toLowerCase();
    if (["user", "verifier", "issuer", "admin"].includes(normalized)) {
      return normalized as "user" | "verifier" | "issuer" | "admin";
    }
    return "user";
  }

  const value: AuthContextType = {
    user,
    role: user?.role || "guest",
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useAuthOptional() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      role: "guest",
      isAuthenticated: false,
      loading: false,
      login: async (_email: string, _password: string) => {},
      logout: () => {},
      refreshUser: async () => {},
    } as AuthContextType;
  }
  return ctx;
}
