import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isValidTab } from "./tabs";
import Dashboard from "../components/Dashboard";

/**
 * Routes tab requests to Dashboard component.
 * Dashboard internally handles all tabs and dispatches to appropriate content.
 * ProtectedRoute guarantees `user` is non-null by the time this renders.
 */
export default function DashboardRoute() {
  const { user, logout, updateUser } = useAuth();
  const { tab } = useParams<{ tab: string }>();

  if (!user) return null;

  // Validate tab from URL param
  if (!isValidTab(tab)) {
    return <Navigate to="/app/issues" replace />;
  }

  // All routing is now handled by Dashboard component
  return (
    <Dashboard
      user={user}
      onLogout={logout}
      onUpdateUser={updateUser}
      theme="light"
      toggleTheme={() => {}}
    />
  );
}
