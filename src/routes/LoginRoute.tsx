import { Navigate, useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../context/AuthContext";

export default function LoginRoute() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/app" replace />;

  return (
    <AuthModal
      onLoginSuccess={(loggedInUser) => {
        login(loggedInUser);
        navigate("/app", { replace: true });
      }}
      theme="light"
      toggleTheme={() => {}}
    />
  );
}
