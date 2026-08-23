import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../api/types";

// Props type for ProtectedRoute
interface ProtectedRouteProps {
  /**
   * Roles allowed to access the wrapped routes.
   *
   * Role restrictions must be declared here, at the call site (see App.tsx).
   * This guard intentionally keeps no knowledge of the application's route
   * table, so routes cannot silently fall out of sync with the route
   * configuration. Public routes should not be wrapped in this guard at all.
   */
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  // Use centralized auth context instead of localStorage
  const { user } = useAuth();

  // If no user is logged in, redirect to login page
  if (!user) return <Navigate to="/login" replace />;

  // If a caller provided an explicit list of allowed roles, enforce it
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Without `allowedRoles`, any authenticated user may pass through
  return <Outlet />;
};

export default ProtectedRoute;
