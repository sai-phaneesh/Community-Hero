import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Layout guard for /app. Renders the matched child route via <Outlet/> when a
 * user is authenticated, otherwise redirects to /login.
 */
export default function ProtectedRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
