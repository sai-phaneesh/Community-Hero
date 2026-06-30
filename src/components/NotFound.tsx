import { useNavigate } from "react-router-dom";
import { AlertCircle, Home } from "lucide-react";

/**
 * 404 Not Found page - displayed when user navigates to invalid routes
 */
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
            <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold font-mono text-slate-900 dark:text-white">
            404
          </h1>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Page Not Found
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Sorry! The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-4">
          <button
            onClick={() => navigate("/app")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>

        {/* Error Details */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-left text-xs space-y-1">
          <p className="font-mono text-slate-500 dark:text-slate-400">
            <span className="text-slate-400 dark:text-slate-500">Error:</span>{" "}
            <span className="text-red-600 dark:text-red-400">
              404 Not Found
            </span>
          </p>
          <p className="font-mono text-slate-500 dark:text-slate-400">
            <span className="text-slate-400 dark:text-slate-500">Route:</span>{" "}
            <span className="text-slate-700 dark:text-slate-300">
              {window.location.pathname}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
