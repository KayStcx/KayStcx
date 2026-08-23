import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../api/types";

// Define props type for ProtectedRoute
interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

/**
 * Route guard that derives authorization from the `allowedRoles` prop passed
 * by each <Route> in App.tsx. Routes without an explicit `allowedRoles` list
 * default to allowing any authenticated user, which keeps authorization
 * centralized in the route configuration instead of a duplicated, hardcoded
 * path-to-role map that can drift out of sync.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user } = useAuth();

  // If no user is logged in, redirect to the login page.
  if (!user) return <Navigate to="/login" replace />;

  // When a caller provides an explicit list of allowed roles, enforce it.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
