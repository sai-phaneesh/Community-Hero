import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MapPin, AlertCircle, CheckCircle2, Send } from "lucide-react";
import { trpc } from "../frontend/trpc";
import { useMultiUpload } from "../frontend/hooks/useMultiUpload";
import { useOnlineStatus } from "../frontend/hooks/useOnlineStatus";

export default function ReportPage() {
  const navigate = useNavigate();
  const isOffline = useOnlineStatus();
  const utils = trpc.useUtils();

  const [reportTitle, setReportTitle] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [manualCategory, setManualCategory] = useState("Water Leakage");
  const [manualSeverity, setManualSeverity] = useState<
    "Low" | "Medium" | "High" | "Critical"
  >("Medium");
  const [manualWaste, setManualWaste] = useState("");
  const [reportLat, setReportLat] = useState("");
  const [reportLng, setReportLng] = useState("");

  const {
    uploadedBeforeImages,
    uploadedBeforeVideos,
    uploadProgress,
    uploadingFileName,
    uploadError,
    handleMultipleFilesChange,
    setUploadedBeforeImages,
    setUploadedBeforeVideos,
    resetBeforeUploads,
  } = useMultiUpload();

  const capabilityGroupsQuery = trpc.capability.listGroups.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const capabilityGroups = capabilityGroupsQuery.data || [];
  const capabilities = capabilityGroups.flatMap((g) => g.capabilities || []);

  const reportMutation = trpc.issue.report.useMutation();

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
      () => {
        toast.error("Failed to retrieve location coordinates automatically.", {
          id: toastId,
        });
      },
    );
  };

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
      const selectedCap = capabilities.find((c) => c.name === manualCategory);
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
      setReportTitle("");
      setReportDesc("");
      setReportLat("");
      setReportLng("");
      resetBeforeUploads();
      utils.issue.list.invalidate();
      navigate("/app/issues");
    } catch (err: any) {
      toast.error(err.message || "Error reporting issue", { id: toastId });
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h2 className="text-base font-bold tracking-tight text-slate-900">
          Report a Hyperlocal Issue
        </h2>
        <p className="text-slate-500 text-xs mt-0.5 font-sans">
          Provide details. Use our built-in Gemini AI audit tool to instantly
          categorize the issue and evaluate environmental waste impacts.
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

        {/* Classification Block */}
        <div className="border-t border-slate-200 pt-3 space-y-3">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Issue Classification & Severity Settings
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">
                Category
              </label>
              <select
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded py-1 px-2 text-slate-800 text-xs focus:outline-none focus:border-slate-500"
              >
                {capabilityGroups.map((group) => (
                  <optgroup key={group.id} label={group.name}>
                    {(group.capabilities || []).map((cap: any) => (
                      <option key={cap.id} value={cap.name}>
                        {cap.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {(() => {
                const selectedCap = capabilities.find(
                  (c) => c.name === manualCategory,
                );
                if (!selectedCap) return null;
                return (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 flex flex-col gap-1 text-left">
                    <p>
                      <strong>Description:</strong> {selectedCap.description}
                    </p>
                    {selectedCap.imageUrls &&
                      selectedCap.imageUrls.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto pt-1 mt-1 border-t border-slate-200">
                          {selectedCap.imageUrls.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={selectedCap.name}
                              className="h-10 w-12 object-cover rounded border border-slate-300 shrink-0"
                            />
                          ))}
                        </div>
                      )}
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">
                Severity Level
              </label>
              <select
                value={manualSeverity}
                onChange={(e) => setManualSeverity(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded py-1 px-2 text-slate-800 text-xs focus:outline-none focus:border-slate-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">
              Waste Footprint Description
            </label>
            <input
              type="text"
              value={manualWaste}
              onChange={(e) => setManualWaste(e.target.value)}
              placeholder="e.g. 500 liters of water leaking daily, hazardous road blocks"
              className="w-full bg-slate-50 border border-slate-300 rounded py-1 px-2 text-slate-800 text-xs focus:outline-none focus:border-slate-500 font-sans"
            />
          </div>
        </div>

        {/* Geolocation Coordinates */}
        <div className="bg-slate-50 border border-slate-300 rounded p-3 text-xs space-y-2">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Geographical Location (Optional)
            </label>
            <button
              type="button"
              onClick={handleDetectLocation}
              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 cursor-pointer"
            >
              <MapPin className="h-3 w-3" />
              Auto-detect Location
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">
                Latitude
              </label>
              <input
                type="text"
                placeholder="e.g. 12.9716"
                value={reportLat}
                onChange={(e) => setReportLat(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded py-1 px-2 text-slate-800 text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">
                Longitude
              </label>
              <input
                type="text"
                placeholder="e.g. 77.5946"
                value={reportLng}
                onChange={(e) => setReportLng(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded py-1 px-2 text-slate-800 text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* File Attachment Upload */}
        <div className="bg-slate-50 border border-slate-300 rounded p-3 text-xs space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Image or Video Attachments
          </label>
          <p className="text-[10px] text-slate-400 mb-2 font-mono">
            Max image size: 5MB. Max video size: 25MB. Select multiple files to
            upload.
          </p>

          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => handleMultipleFilesChange(e, "before")}
              className="hidden"
              id="issue-file-upload"
            />
            <label
              htmlFor="issue-file-upload"
              className="px-3 py-1.5 bg-slate-900 text-emerald-400 hover:text-emerald-300 font-semibold border border-slate-700 rounded text-xs transition-all cursor-pointer inline-block"
            >
              Choose Media Files
            </label>
            <span className="text-[11px] text-slate-600 truncate max-w-xs font-mono">
              {uploadedBeforeImages.length + uploadedBeforeVideos.length} file(s)
              attached
            </span>
          </div>

          {uploadProgress !== null && uploadingFileName && (
            <div className="mt-3.5 space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                <span className="truncate max-w-[200px]">
                  Uploading {uploadingFileName}...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {uploadError && (
            <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {uploadError}
            </p>
          )}

          {(uploadedBeforeImages.length > 0 ||
            uploadedBeforeVideos.length > 0) && (
            <div className="mt-3.5 space-y-1 bg-white p-2 rounded border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Attached Media:
              </span>
              <div className="space-y-1">
                {uploadedBeforeImages.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-[11px] text-slate-600"
                  >
                    <span className="truncate max-w-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Image {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setUploadedBeforeImages((prev) =>
                          prev.filter((u) => u !== url),
                        )
                      }
                      className="text-red-500 hover:underline text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {uploadedBeforeVideos.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-[11px] text-slate-600"
                  >
                    <span className="truncate max-w-xs text-blue-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Video {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setUploadedBeforeVideos((prev) =>
                          prev.filter((u) => u !== url),
                        )
                      }
                      className="text-red-500 hover:underline text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Form Action Buttons */}
        <div className="flex gap-2 pt-3 border-t border-slate-200 justify-end">
          <button
            type="button"
            onClick={() => {
              setReportTitle("");
              setReportDesc("");
              navigate("/app/issues");
            }}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded text-xs font-bold text-slate-600 transition-all cursor-pointer"
          >
            Cancel
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
    </div>
  );
}
