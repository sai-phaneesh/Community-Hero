import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { trpc } from "../../../frontend/trpc";
import { toast } from "sonner";

/**
 * Issue Proposals page - View and manage bids/proposals for an issue
 */
export default function IssueProposalsPage() {
  const { user } = useAuth();
  const { id: issueId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch issue details
  const issueQuery = trpc.issue.get.useQuery(
    { id: issueId || "" },
    { enabled: !!issueId }
  );

  // Fetch bids for the issue
  const bidsQuery = trpc.bid.listForIssue.useQuery(
    { issueId: issueId || "" },
    { enabled: !!issueId }
  );

  if (issueQuery.isLoading || bidsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading proposals...</p>
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
  const bids = bidsQuery.data || [];

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
            Proposals for Issue #{issue.id}
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

        {/* Proposals List */}
        <div className="space-y-4">
          {bids.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 text-center">
              <Zap
                size={48}
                className="mx-auto text-slate-300 dark:text-slate-600 mb-4"
              />
              <p className="text-slate-600 dark:text-slate-400">
                No proposals yet
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                Contractors haven't submitted any bids for this issue yet.
              </p>
            </div>
          ) : (
            bids.map((bid: any) => (
              <div
                key={bid.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {bid.contractorName || "Unnamed Contractor"}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Bid #{bid.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        ${bid.bidAmount?.toFixed(2) || "N/A"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        {bid.status || "Active"}
                      </p>
                    </div>
                  </div>

                  {bid.description && (
                    <div className="bg-slate-50 dark:bg-slate-700 rounded p-3 mb-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {bid.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {bid.estimatedDays && (
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">
                          Estimated Time
                        </p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {bid.estimatedDays} days
                        </p>
                      </div>
                    )}
                    {bid.rating && (
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">
                          Rating
                        </p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {bid.rating}⭐
                        </p>
                      </div>
                    )}
                    {bid.createdAt && (
                      <div>
                        <p className="text-slate-600 dark:text-slate-400">
                          Submitted
                        </p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {new Date(bid.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
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
