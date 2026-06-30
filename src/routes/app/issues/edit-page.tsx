import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, AlertCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { trpc } from "../../../frontend/trpc";
import { useMultiUpload } from "../../../frontend/hooks/useMultiUpload";
import { useOnlineStatus } from "../../../frontend/hooks/useOnlineStatus";
import { toast } from "sonner";

/**
 * Edit Issue page - For reporters to edit their infrastructure issues
 */
export default function IssueEditPage() {
  const { user } = useAuth();
  const { id: issueId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isOffline = useOnlineStatus();

  // Fetch issue details
  const issueQuery = trpc.issue.get.useQuery(
    { id: issueId || "" },
    { enabled: !!issueId },
  );

  // Form state
  const [reportTitle, setReportTitle] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportLat, setReportLat] = useState("");
  const [reportLng, setReportLng] = useState("");
  const [manualCategory, setManualCategory] = useState("Water Leakage");
  const [manualSeverity, setManualSeverity] = useState<
    "Low" | "Medium" | "High" | "Critical"
  >("Medium");
  const [manualWaste, setManualWaste] = useState("");

  // File uploads
  const {
    uploadedBeforeImages,
    uploadedBeforeVideos,
    uploadProgress,
    uploadingFileName,
  } = useMultiUpload();

  // tRPC hooks
  const updateMutation = trpc.issue.update.useMutation();
  const capabilityGroupsQuery = trpc.capability.listGroups.useQuery();

  // Pre-populate form when issue loads
  useEffect(() => {
    if (issueQuery.data) {
      const issue = issueQuery.data;
      setReportTitle(issue.title || "");
      setReportDesc(issue.description || "");
      setReportLat(issue.latitude?.toString() || "");
      setReportLng(issue.longitude?.toString() || "");
      setManualCategory(issue.category || "Water Leakage");
      setManualSeverity(
        (issue.severity as "Low" | "Medium" | "High" | "Critical") || "Medium",
      );
      setManualWaste(issue.wasteCaused || "");
    }
  }, [issueQuery.data]);

  // Get capabilities
  const capabilityGroups = capabilityGroupsQuery.data || [];
  const capabilities = capabilityGroups.flatMap(
    (g: any) => g.capabilities || [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!issueId) {
      toast.error("Issue ID not found.");
      return;
    }

    if (reportTitle.trim().length < 5) {
      toast.error("Issue title must be at least 5 characters long.");
      return;
    }
    if (reportDesc.trim().length < 15) {
      toast.error(
        "Please provide a detailed description (at least 15 characters).",
      );
      return;
    }
    if (manualWaste.trim().length < 3) {
      toast.error("Waste caused description must be at least 3 characters.");
      return;
    }
    if (uploadProgress !== null) {
      toast.error(
        "Please wait for your image/video attachments to finish uploading.",
      );
      return;
    }

    const toastId = toast.loading("Updating issue...");
    try {
      const selectedCap = capabilities.find(
        (c: any) => c.name === manualCategory,
      );

      await updateMutation.mutateAsync({
        id: issueId,
        title: reportTitle,
        description: reportDesc,
        category: manualCategory,
        capabilityId: selectedCap?.id,
        severity: manualSeverity,
        wasteCaused: manualWaste,
        latitude: reportLat ? parseFloat(reportLat) : undefined,
        longitude: reportLng ? parseFloat(reportLng) : undefined,
      });

      toast.dismiss(toastId);
      toast.success("Issue updated successfully!");
      navigate(`/app/issues`);
    } catch (err: any) {
      toast.dismiss(toastId);
      const errorMsg =
        err?.message || "Failed to update issue. Please try again.";
      toast.error(errorMsg);
    }
  };

  if (issueQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading issue...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header with back button */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => navigate("/app/issues")}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Edit Issue
          </h1>
        </div>

        {/* Main form card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6">
            <h2 className="text-xl font-semibold text-white">
              {reportTitle || "Untitled Issue"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {isOffline && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 flex gap-3">
                <AlertCircle
                  className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                  size={20}
                />
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-100">
                    You are offline
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Your changes will be saved when you reconnect.
                  </p>
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Brief title of the issue"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Minimum 5 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                placeholder="Provide as many details as possible about the issue..."
                rows={5}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Minimum 15 characters
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {capabilities.map((cap: any) => (
                  <option key={cap.id} value={cap.name}>
                    {cap.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Severity Level <span className="text-red-500">*</span>
              </label>
              <select
                value={manualSeverity}
                onChange={(e) => setManualSeverity(e.target.value as any)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Waste Caused */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Waste/Resource Caused <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={manualWaste}
                onChange={(e) => setManualWaste(e.target.value)}
                placeholder="e.g., Water leakage ~500 gallons per day"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Minimum 3 characters
              </p>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={reportLat}
                  onChange={(e) => setReportLat(e.target.value)}
                  placeholder="e.g., 40.7128"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={reportLng}
                  onChange={(e) => setReportLng(e.target.value)}
                  placeholder="e.g., -74.0060"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={updateMutation.isPending || uploadProgress !== null}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-semibold rounded-lg transition disabled:cursor-not-allowed"
              >
                <Send size={18} />
                {updateMutation.isPending ? "Updating..." : "Update Issue"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/app/issues")}
                className="flex-1 px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-semibold rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
