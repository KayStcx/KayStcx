import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../api/types";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
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

const renderGuard = (user: { id: string; email: string; role: UserRole } | null, allowedRoles?: UserRole[]) => {
  mockUseAuth(user);
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/" element={<div>Home page</div>} />
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/protected" element={<div>Protected content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to /login", () => {
    renderGuard(null);

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the outlet when the user's role is in allowedRoles", () => {
    renderGuard(sessionUser(UserRole.RECIPIENT), [UserRole.RECIPIENT, UserRole.VERIFIER]);

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects to / when the user's role is not in allowedRoles", () => {
    renderGuard(sessionUser(UserRole.RECIPIENT), [UserRole.ISSUER, UserRole.ADMIN]);

    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the outlet for any authenticated user when allowedRoles is omitted", () => {
    renderGuard(sessionUser(UserRole.RECIPIENT), undefined);

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
