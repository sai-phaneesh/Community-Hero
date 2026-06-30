import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { trpc } from "../../../frontend/trpc";
import { toast } from "sonner";

/**
 * Issue Timeline page - View timeline events for an issue
 */
export default function IssueTimelinePage() {
  const { user } = useAuth();
  const { id: issueId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch issue details
  const issueQuery = trpc.issue.get.useQuery(
    { id: issueId || "" },
    { enabled: !!issueId }
  );

  // Fetch timeline events
  const timelineQuery = trpc.issueTimeline.listForIssue.useQuery(
    { issueId: issueId || "" },
    { enabled: !!issueId }
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "reported":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700";
      case "acknowledged":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
      case "assigned":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700";
      case "in_progress":
        return "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700";
      case "completed":
        return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700";
      case "verified":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700";
      default:
        return "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600";
    }
  };

  if (issueQuery.isLoading || timelineQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading timeline...</p>
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
  const timeline = timelineQuery.data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with back button */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate("/app/issues")}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Timeline for Issue #{issue.id}
          </h1>
        </div>

        {/* Issue Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">
              {issue.title}
            </span>
          </p>
        </div>

        {/* Timeline */}
        <div className="space-y-0">
          {timeline.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 text-center">
              <Clock
                size={48}
                className="mx-auto text-slate-300 dark:text-slate-600 mb-4"
              />
              <p className="text-slate-600 dark:text-slate-400">
                No timeline events yet
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
              {timeline.map((event: any, idx: number) => (
                <div
                  key={event.id || idx}
                  className={`p-6 ${
                    idx !== timeline.length - 1
                      ? "border-b border-slate-200 dark:border-slate-700"
                      : ""
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 dark:bg-emerald-400 mt-2"></div>
                      {idx !== timeline.length - 1 && (
                        <div className="w-0.5 h-12 bg-slate-200 dark:bg-slate-700 my-2"></div>
                      )}
                    </div>

                    {/* Event content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                                event.status
                              )}`}
                            >
                              {event.status || "Event"}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-slate-700 dark:text-slate-300 mb-2">
                              {event.description}
                            </p>
                          )}
                        </div>
                        {event.createdAt && (
                          <time className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap flex-shrink-0">
                            {new Date(event.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </time>
                        )}
                      </div>

                      {/* Additional details if available */}
                      {(event.metadata || event.actorId || event.changedFields) && (
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded text-xs text-slate-600 dark:text-slate-400">
                          {event.metadata && (
                            <p>
                              <strong>Details:</strong>{" "}
                              {typeof event.metadata === "object"
                                ? JSON.stringify(event.metadata)
                                : event.metadata}
                            </p>
                          )}
                          {event.actorName && (
                            <p>
                              <strong>By:</strong> {event.actorName}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => navigate("/app/issues")}
            className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold transition"
          >
            Back to Issues
          </button>
        </div>
      </div>
    </div>
  );
}
