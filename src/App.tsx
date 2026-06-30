import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { roleDefaultTab } from "./routes/tabs";
import LoginRoute from "./routes/LoginRoute";
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardRoute from "./routes/DashboardRoute";
import NotFound from "./components/NotFound";

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route path="/app" element={<ProtectedRoute />}>
          {/* Redirect /app → /app/<role-default-tab> */}
          <Route
            index
            element={<Navigate to={`/app/${roleDefaultTab(user)}`} replace />}
          />
          {/* All tabs — Dashboard monolith handles its own chrome */}
          <Route path=":tab" element={<DashboardRoute />} />
        </Route>

        <Route
          path="/"
          element={<Navigate to={user ? "/app" : "/login"} replace />}
        />
        
        {/* 404 Not Found - Catch all invalid routes */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
