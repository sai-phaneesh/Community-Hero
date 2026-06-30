import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { trpc } from "../frontend/trpc";

type AnnCategory =
  | "Water Cut"
  | "Electricity Outage"
  | "Garbage Collection"
  | "Water Outlet"
  | "Other";

export default function AdminAnnouncements() {
  const navigate = useNavigate();

  const [annTitle, setAnnTitle] = useState("");
  const [annDesc, setAnnDesc] = useState("");
  const [annCategory, setAnnCategory] = useState<AnnCategory>("Water Cut");
  const [annDate, setAnnDate] = useState("");
  const [annStart, setAnnStart] = useState("");
  const [annEnd, setAnnEnd] = useState("");
  const [annAreas, setAnnAreas] = useState("");

  const announcementsQuery = trpc.announcement.list.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const createAnnouncementMutation = trpc.announcement.create.useMutation({
    onSuccess: () => {
      announcementsQuery.refetch();
      toast.success("Utility announcement scheduled!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to schedule announcement.");
    },
  });

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (annTitle.trim().length < 5) {
      toast.error("Announcement title must be at least 5 characters long.");
      return;
    }
    if (annDesc.trim().length < 15) {
      toast.error(
        "Announcement description must be at least 15 characters long.",
      );
      return;
    }

    const toastId = toast.loading("Scheduling utility announcement...");
    try {
      const areas = annAreas
        ? annAreas
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean)
        : [];
      await createAnnouncementMutation.mutateAsync({
        title: annTitle,
        description: annDesc,
        category: annCategory,
        scheduledDate: annDate || undefined,
        startTime: annStart || undefined,
        endTime: annEnd || undefined,
        affectedAreas: areas,
      });
      toast.success("Announcement successfully scheduled!", { id: toastId });
      setAnnTitle("");
      setAnnDesc("");
      setAnnDate("");
      setAnnStart("");
      setAnnEnd("");
      setAnnAreas("");
      navigate("/app/issues");
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule announcement.", {
        id: toastId,
      });
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div>
        <h2 className="text-base font-bold tracking-tight text-slate-900 font-sans">
          Official Alert Broadcast Console
        </h2>
        <p className="text-slate-500 text-xs mt-0.5 font-sans">
          Dispatch priority alert notifications to all registered community
          residents.
        </p>
      </div>

      <form
        onSubmit={handleBroadcastSubmit}
        className="bg-white border border-slate-300 p-5 rounded space-y-4 shadow-sm text-left"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Announcement Category
            </label>
            <select
              value={annCategory}
              onChange={(e) => setAnnCategory(e.target.value as AnnCategory)}
              className="w-full bg-slate-50 border border-slate-300 rounded py-1.5 px-2 text-slate-800 text-xs focus:outline-none focus:border-slate-500 font-sans"
            >
              <option value="Water Cut">Water Cut / Maintenance</option>
              <option value="Electricity Outage">
                Electricity Outage / Cuts
              </option>
              <option value="Garbage Collection">Garbage Collection Time</option>
              <option value="Water Outlet">Scheduled Water Outlet</option>
              <option value="Other">Other Community Announcement</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Announcement Title
            </label>
            <input
              type="text"
              required
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              placeholder="e.g. Schedule Water Maintenance: Lane 4"
              className="w-full bg-slate-50 border border-slate-300 rounded py-1.5 px-2.5 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500 font-sans"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Announcement Message / Description
          </label>
          <textarea
            required
            rows={3}
            value={annDesc}
            onChange={(e) => setAnnDesc(e.target.value)}
            placeholder="Provide full description of the alert, duration of works, and instructions..."
            className="w-full bg-slate-50 border border-slate-300 rounded py-1.5 px-2.5 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500 font-sans"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">
              Scheduled Date
            </label>
            <input
              type="date"
              value={annDate}
              onChange={(e) => setAnnDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded py-1 px-2 text-slate-800 text-xs focus:outline-none focus:border-slate-500 font-sans"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">
              Start Time
            </label>
            <input
              type="time"
              value={annStart}
              onChange={(e) => setAnnStart(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded py-1 px-2 text-slate-800 text-xs focus:outline-none focus:border-slate-500 font-sans"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">
              End Time
            </label>
            <input
              type="time"
              value={annEnd}
              onChange={(e) => setAnnEnd(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded py-1 px-2 text-slate-800 text-xs focus:outline-none focus:border-slate-500 font-sans"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Affected Areas (Comma-separated)
          </label>
          <input
            type="text"
            value={annAreas}
            onChange={(e) => setAnnAreas(e.target.value)}
            placeholder="e.g. Lane 1, Lane 2, Park Circus"
            className="w-full bg-slate-50 border border-slate-300 rounded py-1.5 px-2.5 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500 font-sans"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => navigate("/app/issues")}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded text-xs font-bold text-slate-600 transition-all cursor-pointer font-sans"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-1.5 rounded text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm font-sans"
          >
            <Megaphone className="h-3.5 w-3.5" />
            Schedule Broadcast
          </button>
        </div>
      </form>
    </div>
  );
}
