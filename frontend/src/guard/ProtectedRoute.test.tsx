import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../api/types";
import type { SessionUser } from "../context/authStorage";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockAuth = (user: SessionUser | null) => {
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

const renderGuard = ({
  path,
  allowedRoles,
}: {
  path: string;
  allowedRoles?: UserRole[];
}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>Home page</div>} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path={path} element={<div>Protected content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const makeUser = (role: UserRole): SessionUser => ({
  id: "user-1",
  email: "user@example.com",
  role,
});

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockAuth(null);
  });

  it("redirects unauthenticated users to /login", () => {
    renderGuard({ path: "/issue" });

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to /login when no allowedRoles is provided", () => {
    renderGuard({ path: "/admin" });

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it.each([
    [UserRole.ADMIN],
    [UserRole.ISSUER],
    [UserRole.RECIPIENT],
    [UserRole.VERIFIER],
  ])("renders the outlet for a %s user on an allowed route", (role) => {
    mockAuth(makeUser(role));
    renderGuard({
      path: "/wallet",
      allowedRoles: [
        UserRole.RECIPIENT,
        UserRole.VERIFIER,
        UserRole.ISSUER,
        UserRole.ADMIN,
      ],
    });

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });

  it("redirects a RECIPIENT user away from an ISSUER-only route", () => {
    mockAuth(makeUser(UserRole.RECIPIENT));
    renderGuard({
      path: "/issue",
      allowedRoles: [UserRole.ISSUER, UserRole.ADMIN],
    });

    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("redirects a VERIFIER user away from an ISSUER-only route", () => {
    mockAuth(makeUser(UserRole.VERIFIER));
    renderGuard({
      path: "/issue",
      allowedRoles: [UserRole.ISSUER, UserRole.ADMIN],
    });

    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("allows an ADMIN user to access /admin when no allowedRoles is passed", () => {
    mockAuth(makeUser(UserRole.ADMIN));
    renderGuard({ path: "/admin" });

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
  });

  it("allows any authenticated user through when no allowedRoles is passed", () => {
    mockAuth(makeUser(UserRole.RECIPIENT));
    renderGuard({ path: "/profile" });

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});
