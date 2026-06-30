import Dashboard from "../../../components/Dashboard";
import { useAuth } from "../../../context/AuthContext";

/**
 * Issues Hub page - Main hub for viewing and interacting with issues
 */
export default function IssuesPage() {
  const { user, logout, updateUser } = useAuth();

  return (
    <Dashboard
      user={user!}
      onLogout={logout}
      onUpdateUser={updateUser}
      theme="light"
      toggleTheme={() => {}}
    />
  );
}
