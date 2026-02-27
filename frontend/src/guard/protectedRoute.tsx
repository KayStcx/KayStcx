import React from "react";
import { Navigate, Outlet } from "react-router-dom";

// Define props type for ProtectedRoute
interface ProtectedRouteProps {
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const currentPath: string = window.location.pathname;

  // Allow public access to /verify
  if (currentPath === "/verify") return <Outlet />;

  // Retrieve user data from localStorage
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;

  // If no user is logged in, redirect to login page
  if (!user) return <Navigate to="/login" replace />;

  // Get user role
  const userRole: string = user.role;

  // Check if the user's role is allowed
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
