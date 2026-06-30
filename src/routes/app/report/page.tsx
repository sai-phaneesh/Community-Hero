import React, { useState, useEffect } from "react";
import { Send, AlertCircle } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { trpc } from "../../../frontend/trpc";
import { useMultiUpload } from "../../../frontend/hooks/useMultiUpload";
import { toast } from "sonner";

/**
 * Report New Issue page - For residents to report infrastructure issues
 */
export default function ReportPage() {
  const { user } = useAuth();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Form state
  const [reportTitle, setReportTitle] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportLat, setReportLat] = useState("");
  const [reportLng, setReportLng] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    category: string;
    severity: string;
    wasteCaused: string;
    repairSuggestion: string;
    authenticityClues: string;
  } | null>(null);

  // Manual overrides
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
    resetBeforeUploads,
  } = useMultiUpload();

  // tRPC hooks
  const reportMutation = trpc.issue.report.useMutation();
  const issuesQuery = trpc.issue.list.useQuery();
  const capabilityGroupsQuery = trpc.capability.listGroups.useQuery();

  // Get capabilities
  const capabilityGroups = capabilityGroupsQuery.data || [];
  const capabilities = capabilityGroups.flatMap((g: any) => g.capabilities || []);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
    if (uploadProgress !== null) {
      toast.error(
        "Please wait for your image/video attachments to finish uploading.",
      );
      return;
    }

    const toastId = toast.loading("Broadcasting report to community hub...");
    try {
      const selectedCap = capabilities.find((c: any) => c.name === manualCategory);
      await reportMutation.mutateAsync({
        title: reportTitle,
        description: reportDesc,
        category: manualCategory,
        capabilityId: selectedCap?.id,
        severity: manualSeverity,
        wasteCaused: manualWaste || "Resource leakage under evaluation.",
        beforeImages: uploadedBeforeImages,
        beforeVideos: uploadedBeforeVideos,
        latitude: reportLat ? parseFloat(reportLat) : undefined,
        longitude: reportLng ? parseFloat(reportLng) : undefined,
      });
      toast.success("Report published successfully!", { id: toastId });
      // Reset form after successful submission
      handleClearFormConfirmed();
      issuesQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Error reporting issue", { id: toastId });
    }
  };

  const handleClearFormConfirmed = () => {
    setReportTitle("");
    setReportDesc("");
    setReportLat("");
    setReportLng("");
    setManualCategory("Water Leakage");
    setManualSeverity("Medium");
    setManualWaste("");
    setAiAnalysis(null);
    resetBeforeUploads();
    setShowClearConfirmation(false);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    const toastId = toast.loading("Detecting current coordinates...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setReportLat(pos.coords.latitude.toFixed(6));
        setReportLng(pos.coords.longitude.toFixed(6));
        toast.success("Location coordinates successfully locked!", {
          id: toastId,
        });
      },
      (err) => {
        toast.error("Failed to retrieve location coordinates automatically.", {
          id: toastId,
        });
      },
    );
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h2 className="text-base font-bold tracking-tight text-slate-900">
          Report a Hyperlocal Issue
        </h2>
        <p className="text-slate-500 text-xs mt-0.5 font-sans">
          Provide details. Use our built-in Gemini AI audit tool to
          instantly categorize the issue and evaluate environmental
          waste impacts.
        </p>
      </div>

      <form
        onSubmit={handleReportSubmit}
        className="bg-white border border-slate-300 p-5 rounded space-y-4 shadow-sm"
      >
        {/* Title */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Issue Title / Summary
          </label>
          <input
            type="text"
            required
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            placeholder="e.g. Broken water pipe leaking near central curb"
            className="w-full bg-slate-50 border border-slate-300 rounded py-1.5 px-2.5 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500 font-sans"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Detailed Description
          </label>
          <textarea
            required
            rows={3}
            value={reportDesc}
            onChange={(e) => setReportDesc(e.target.value)}
            placeholder="Please specify exactly where the issue is, how long it's been active, and what kind of waste or risk it is generating..."
            className="w-full bg-slate-50 border border-slate-300 rounded py-1.5 px-2.5 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500 font-sans"
          />
        </div>

        {/* Manual Category */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Category
          </label>
          <select
            value={manualCategory}
            onChange={(e) => setManualCategory(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded py-1.5 px-2.5 text-slate-900 text-xs focus:outline-none focus:border-slate-500 font-sans"
          >
            {capabilityGroups.map((group: any) => (
              <optgroup key={group.id} label={group.name}>
                {(group.capabilities || []).map((cap: any) => (
                  <option key={cap.id} value={cap.name}>
                    {cap.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Severity
          </label>
          <select
            value={manualSeverity}
            onChange={(e) => setManualSeverity(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-300 rounded py-1.5 px-2.5 text-slate-900 text-xs focus:outline-none focus:border-slate-500 font-sans"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        {/* Waste Impact */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Waste Impact (Optional)
          </label>
          <textarea
            rows={2}
            value={manualWaste}
            onChange={(e) => setManualWaste(e.target.value)}
            placeholder="Describe the environmental or resource impact..."
            className="w-full bg-slate-50 border border-slate-300 rounded py-1.5 px-2.5 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500 font-sans"
          />
        </div>

        {/* Location */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Location (Optional)
            </label>
            <button
              type="button"
              onClick={handleDetectLocation}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              📍 Detect Current Location
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={reportLat}
                onChange={(e) => setReportLat(e.target.value)}
                placeholder="e.g. 40.7128"
                className="w-full bg-slate-50 border border-slate-300 rounded py-1.5 px-2.5 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500 font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={reportLng}
                onChange={(e) => setReportLng(e.target.value)}
                placeholder="e.g. -74.0060"
                className="w-full bg-slate-50 border border-slate-300 rounded py-1.5 px-2.5 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500 font-sans"
              />
            </div>
          </div>
        </div>

        {/* Uploaded Media */}
        {(uploadedBeforeImages.length > 0 || uploadedBeforeVideos.length > 0) && (
          <div className="border border-slate-200 rounded p-3 bg-slate-50">
            <p className="text-[10px] font-bold text-slate-700 mb-2">
              Attached Media ({uploadedBeforeImages.length +
              uploadedBeforeVideos.length}{" "}
              file(s))
            </p>
            <div className="flex flex-wrap gap-2">
              {uploadedBeforeImages.map((url, i) => (
                <img
                  key={`img-${i}`}
                  src={url}
                  alt={`before-${i}`}
                  className="h-12 w-12 object-cover rounded border border-slate-300"
                />
              ))}
              {uploadedBeforeVideos.map((url, i) => (
                <video
                  key={`vid-${i}`}
                  src={url}
                  className="h-12 w-12 object-cover rounded border border-slate-300"
                />
              ))}
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setShowClearConfirmation(true)}
            className="px-3 py-1.5 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded text-xs font-bold text-slate-600 transition-all cursor-pointer"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isOffline}
            className="flex items-center gap-1.5 bg-slate-900 text-white font-bold px-4 py-1.5 rounded text-xs hover:bg-slate-800 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
            Publish Report
          </button>
        </div>
      </form>

      {/* Clear Confirmation Modal */}
      {showClearConfirmation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4 animate-in">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Clear Form?
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  This will clear all form fields including title, description, category, severity, location, and any uploaded media. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setShowClearConfirmation(false)}
                className="px-4 py-2 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded text-xs font-bold text-slate-600 transition-all cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                onClick={handleClearFormConfirmed}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-all cursor-pointer"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
