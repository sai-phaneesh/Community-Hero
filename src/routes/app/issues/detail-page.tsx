import React, { useState } from "react";
import { useParams, useNavigate, Link, Outlet } from "react-router-dom";
import { ArrowLeft, MapPin, AlertCircle, User, Clock } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { trpc } from "../../../frontend/trpc";
import { useOnlineStatus } from "../../../frontend/hooks/useOnlineStatus";
import { toast } from "sonner";

export default function IssueDetailPage() {
  const { user } = useAuth();
  const { id: issueId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isOffline = useOnlineStatus();

  const issueQuery = trpc.issue.get.useQuery(
    { id: issueId || "" },
    { enabled: !!issueId }
  );

  const deleteIssueMutation = trpc.issue.delete.useMutation({
    onSuccess: () => {
      toast.success("Issue deleted successfully");
      navigate("/app/issues");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete issue");
    },
  });

  if (issueQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading issue details...</p>
        </div>
      </div>
    );
  }

  if (!issueQuery.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Issue not found</p>
          <button
            onClick={() => navigate("/app/issues")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            <ArrowLeft size={16} />
            Back to Issues
          </button>
        </div>
      </div>
    );
  }

  const issue = issueQuery.data;
  const isReporter = user.id === issue.reporterId;
  const isAdmin = user.role === "admin";

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "low":
        return "bg-blue-100 text-blue-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "reported":
        return "bg-blue-100 text-blue-800";
      case "validated":
        return "bg-purple-100 text-purple-800";
      case "assigned":
        return "bg-cyan-100 text-cyan-800";
      case "in progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
        <Link to="/app/issues" className="hover:text-slate-900 flex items-center gap-1">
          <span>Dashboard</span>
        </Link>
        <span>/</span>
        <Link to="/app/issues" className="hover:text-slate-900">
          Issues
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">{issue.id}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/app/issues")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition mb-4"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                {issue.title}
              </h1>
              <p className="text-slate-600 mb-4">{issue.description}</p>

              <div className="flex flex-wrap gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(issue.severity)}`}>
                  {issue.severity} Severity
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(issue.status)}`}>
                  {issue.status}
                </span>
              </div>
            </div>

            {(isReporter || isAdmin) && (
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/app/issues/${issue.id}/edit`)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition text-sm font-semibold"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this issue? This cannot be undone.")) {
                      deleteIssueMutation.mutate({ id: issue.id });
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition text-sm font-semibold"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Issue Meta */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                Category
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {issue.category}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                Reporter
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {issue.reporterName}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                Location
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-1">
                <MapPin size={14} />
                {issue.latitude?.toFixed(4)}, {issue.longitude?.toFixed(4)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                Waste Caused
              </p>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {issue.wasteCaused}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex border-b border-slate-200">
          <Link
            to={`/app/issues/${issue.id}`}
            className="px-6 py-3 text-sm font-semibold border-b-2 border-emerald-600 text-emerald-600"
          >
            Overview
          </Link>
          <Link
            to={`/app/issues/${issue.id}/timeline`}
            className="px-6 py-3 text-sm font-semibold text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-200"
          >
            Timeline
          </Link>
          <Link
            to={`/app/issues/${issue.id}/proposals`}
            className="px-6 py-3 text-sm font-semibold text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-200"
          >
            Proposals
          </Link>
          <Link
            to={`/app/issues/${issue.id}/comments`}
            className="px-6 py-3 text-sm font-semibold text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-200"
          >
            Comments
          </Link>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <Outlet context={{ issue, isReporter, isAdmin }} />
        </div>
      </div>
    </div>
  );
}
