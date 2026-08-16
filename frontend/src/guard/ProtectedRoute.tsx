import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../api/types";

// Route authorization is configured centrally in App.tsx, where each
// protected <Route> passes an explicit `allowedRoles` list. This component
// only enforces that list — there is no hardcoded path → role mapping here
// that could fall out of sync with the route configuration.
interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user } = useAuth();

  // If no user is logged in, redirect to login page
  if (!user) return <Navigate to="/login" replace />;

  // If the caller provided an explicit list of allowed roles, enforce it.
  // Routes without `allowedRoles` default to allowing any authenticated user.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
