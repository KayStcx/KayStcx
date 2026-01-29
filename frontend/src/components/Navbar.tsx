import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthOptional } from "../contexts/AuthContext";

type Role = "user" | "verifier" | "issuer" | "admin" | "guest" | string;

interface NavbarProps {
  role?: Role;
  username?: string;
  onLogout?: () => void;
}

export default function Navbar({
  role: propRole,
  username: propUsername,
  onLogout,
}: NavbarProps) {
  const navigate = useNavigate();
  const { user, role, isAuthenticated, logout, loading } = useAuthOptional();

  const effectiveRole = (propRole || role || "guest") as Role;
  const effectiveUsername =
    propUsername || (user && (user.username as string)) || "";

  function truncateEmail(email: string, maxLocal = 12) {
    if (!email) return "";
    const at = email.indexOf("@");
    if (at > 0) {
      const local = email.slice(0, at);
      const domain = email.slice(at + 1);
      const truncatedLocal =
        local.length > maxLocal ? local.slice(0, maxLocal) + "..." : local;
      return `${truncatedLocal}@${domain}`;
    }
    return email.length > maxLocal ? email.slice(0, maxLocal) + "..." : email;
  }

  const normalizedRole = String(effectiveRole).toLowerCase();
  const roleHas = (allowed: string[]) =>
    allowed.map((r) => r.toLowerCase()).includes(normalizedRole);

  const links: { label: string; to: string; visible: boolean }[] = [
    {
      label: "Dashboard",
      to: "/dashboard",
      visible: roleHas(["issuer", "admin"]),
    },
    { label: "Verify", to: "/verify", visible: roleHas(["verifier", "admin"]) },
    {
      label: "Issue Certificate",
      to: "/create",
      visible: roleHas(["issuer", "admin"]),
    },
    {
      label: "My Certificates",
      to: "/view",
      visible: roleHas(["user", "verifier", "issuer", "admin"]),
    },
    {
      label: "Revoke Certificate",
      to: "/revoke",
      visible: roleHas(["issuer", "admin"]),
    },
  ];

  function handleLogout() {
    try {
      logout();
    } catch (e) {}
    if (onLogout) onLogout();
    navigate("/login");
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white shadow">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div
            aria-hidden="false"
            role="img"
            aria-label="CertifyChain logo"
            className="flex h-10 w-10 items-center justify-center rounded bg-white/10"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-white"
              aria-hidden="true"
            >
              <title>CertifyChain</title>
              <circle cx="12" cy="8" r="3.2" fill="white" />
              <path
                d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"
                stroke="white"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <div>
            <div className="text-lg font-semibold leading-none">
              CertifyChain
            </div>
          </div>
        </div>

        {/* Center: Navigation */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex md:items-center md:gap-6"
        >
          {links.map((item) =>
            item.visible ? (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${isActive ? "text-white underline" : "text-blue-50 hover:text-white"}`
                }
              >
                {item.label}
              </NavLink>
            ) : null,
          )}
        </nav>

        {/* Right: Auth Actions */}
        <div className="flex items-center gap-3">
          {!loading && isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="max-w-[14rem] truncate text-sm font-medium text-white">
                {truncateEmail(effectiveUsername)}
              </div>
              <button
                onClick={handleLogout}
                className="rounded bg-white px-3 py-1 text-sm font-medium text-blue-600 hover:opacity-90"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <NavLink
                to="/login"
                className="rounded bg-white px-3 py-1 text-sm font-medium text-blue-600"
              >
                Login
              </NavLink>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav: simple row of allowed links */}
      <div className="flex w-full gap-2 overflow-x-auto border-t border-blue-500/40 bg-blue-600/95 px-3 py-2 md:hidden">
        {links.map((item) =>
          item.visible ? (
            <NavLink
              key={`mobile-${item.to}`}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${isActive ? "bg-white text-blue-600" : "bg-white/10 text-white/90"}`
              }
            >
              {item.label}
            </NavLink>
          ) : null,
        )}
      </div>
    </header>
  );
}
