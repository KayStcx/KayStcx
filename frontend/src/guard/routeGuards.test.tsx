import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../api/types";

vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: vi.fn(),
}));

vi.mock("../context/NotificationContext", () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../components/Header", () => ({
  default: () => <nav data-testid="header" />,
}));

vi.mock("../components/Toast", () => ({
  default: () => null,
}));

// Only the pages reachable from the guarded-route matrix (or as redirect
// targets) need mocks; the rest of App's lazy imports never render in these
// tests.
vi.mock("../pages/Dashboard", () => ({
  default: () => <div>Dashboard page</div>,
}));
vi.mock("../pages/Login", () => ({
  default: () => <div>Login page</div>,
}));
vi.mock("../pages/CertificateWallet", () => ({
  default: () => <div>Wallet page</div>,
}));
vi.mock("../pages/IssueCertificate", () => ({
  default: () => <div>Issue page</div>,
}));
vi.mock("../pages/RevokeCertificate", () => ({
  default: () => <div>Revoke page</div>,
}));
vi.mock("../pages/CertificateManagement", () => ({
  default: () => <div>Certificates page</div>,
}));

const sessionUser = (role: UserRole) => ({
  id: "user-1",
  email: "user@example.com",
  role,
});

const mockUseAuth = (user: { id: string; email: string; role: UserRole } | null) => {
  vi.mocked(useAuth).mockReturnValue({
    user,
    profile: null,
    setUser: vi.fn(),
    setProfile: vi.fn(),
    isAuthenticated: !!user,
    isLoading: false,
    loadProfile: vi.fn(),
    clearAuth: vi.fn(),
    login: vi.fn(),
  } as never);
};

const renderAppAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

/**
 * The protected routes declared in App.tsx, with the page they render and the
 * roles each route explicitly allows via the `allowedRoles` prop. This table
 * mirrors the route configuration so the tests fail loudly if a route's guard
 * drifts out of sync.
 */
const protectedRoutes = [
  {
    path: "/wallet",
    page: "Wallet page",
    roles: [UserRole.RECIPIENT, UserRole.VERIFIER, UserRole.ISSUER, UserRole.ADMIN],
  },
  {
    path: "/issue",
    page: "Issue page",
    roles: [UserRole.ISSUER, UserRole.ADMIN],
  },
  {
    path: "/revoke",
    page: "Revoke page",
    roles: [UserRole.ISSUER, UserRole.ADMIN],
  },
  {
    path: "/certificates",
    page: "Certificates page",
    roles: [UserRole.ISSUER, UserRole.ADMIN],
  },
];

const guardMatrix = protectedRoutes.flatMap(({ path, page, roles }) =>
  Object.values(UserRole).map((role) => ({
    path,
    page,
    role,
    allowed: roles.includes(role),
  })),
);

describe("App route guards", () => {
  it.each(guardMatrix)(
    "$role access to $path (allowed: $allowed)",
    async ({ path, page, role, allowed }) => {
      mockUseAuth(sessionUser(role));
      renderAppAt(path);

      if (allowed) {
        expect(await screen.findByText(page)).toBeInTheDocument();
      } else {
        // Denied roles are redirected to "/" (Dashboard), never shown the page.
        expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
        expect(screen.queryByText(page)).not.toBeInTheDocument();
      }
    },
  );

  it.each(protectedRoutes.map(({ path }) => path))(
    "redirects unauthenticated users from %s to /login",
    async (path) => {
      mockUseAuth(null);
      renderAppAt(path);

      expect(await screen.findByText("Login page")).toBeInTheDocument();
      expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument();
    },
  );
});
