import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../api/types";
import type { User } from "../api/types";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const makeUser = (role: UserRole): User => ({
  id: "user-1",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  role,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

interface MockAuthValue {
  user: User | null;
  setUser: ReturnType<typeof vi.fn>;
  isAuthenticated: boolean;
  isLoading: boolean;
  clearAuth: ReturnType<typeof vi.fn>;
  login: ReturnType<typeof vi.fn>;
}

const mockAuth = (user: User | null): MockAuthValue => ({
  user,
  setUser: vi.fn(),
  isAuthenticated: !!user,
  isLoading: false,
  clearAuth: vi.fn(),
  login: vi.fn(),
});

const renderProtected = (allowedRoles?: UserRole[]) => {
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route element={<ProtectedRoute allowedRoles={allowedRoles} />}>
          <Route path="/protected" element={<div>Protected content</div>} />
        </Route>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(mockAuth(null));
  });

  it("redirects unauthenticated users to /login", () => {
    renderProtected([UserRole.ADMIN]);
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the protected outlet for a user with an allowed role", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuth(makeUser(UserRole.ADMIN)));
    renderProtected([UserRole.ADMIN]);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects a user with a disallowed role to /", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuth(makeUser(UserRole.RECIPIENT)));
    renderProtected([UserRole.ISSUER, UserRole.ADMIN]);
    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("allows any authenticated user when no allowedRoles are provided", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuth(makeUser(UserRole.RECIPIENT)));
    renderProtected(undefined);
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
