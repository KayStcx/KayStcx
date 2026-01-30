import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Create from "./pages/Create";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Verify from "./pages/Verify";
import View from "./pages/View";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: JSX.Element;
}

function ProtectedRoute({
  allowedRoles,
  children,
}: ProtectedRouteProps): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!mounted) return;
        if (!res.ok) {
          setAuthorized(false);
        } else {
          const data = await res.json();
          const role = data?.user?.role;
          setAuthorized(Boolean(role && allowedRoles.includes(role)));
        }
      } catch {
        if (mounted) setAuthorized(false);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    checkAuth();
    return () => {
      mounted = false;
    };
  }, [allowedRoles]);

  if (loading) return <div />;
  if (!authorized)
    return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App(): JSX.Element {
  // Temporary fallback to render Home directly (bypass router) while debugging
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 lg:px-8">
        <Home />
      </main>
      <Footer />
    </div>
  );
}
