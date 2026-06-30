import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { roleDefaultTab } from "./routes/tabs";
import LoginRoute from "./routes/LoginRoute";
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardRoute from "./routes/DashboardRoute";
import NotFound from "./components/NotFound";

// Import issue detail pages
import IssueDetailPage from "./routes/app/issues/detail-page";
import IssueEditPage from "./routes/app/issues/edit-page";
import IssueProposalsPage from "./routes/app/issues/proposals-page";
import IssueTimelinePage from "./routes/app/issues/timeline-page";

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
          
          {/* Issue detail pages - nested under main detail page */}
          <Route path="issues/:id" element={<IssueDetailPage />}>
            <Route index element={<div className="text-slate-600">Overview loaded</div>} />
            <Route path="edit" element={<IssueEditPage />} />
            <Route path="timeline" element={<IssueTimelinePage />} />
            <Route path="proposals" element={<IssueProposalsPage />} />
          </Route>
          
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
