import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { roleDefaultTab } from "./tabs";

type Role = "resident" | "contractor" | "admin";

/**
 * Restricts a group of routes to specific roles. Renders the matched child via
 * <Outlet/> when allowed, otherwise redirects to the user's role-default tab.
 */
export default function RoleGuard({ allow }: { allow: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) {
    return <Navigate to={`/app/${roleDefaultTab(user)}`} replace />;
  }
  return <Outlet />;
}
