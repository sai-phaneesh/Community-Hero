import { useAuth } from "../../../context/AuthContext";

/**
 * Admin Announcements page - For admins to broadcast alerts
 */
export default function AdminAnnouncementsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold tracking-tight text-slate-900 font-sans">
          Alert Broadcast Console
        </h2>
        <p className="text-slate-500 text-xs mt-0.5 font-sans">
          Create and schedule announcements and alerts for the community
        </p>
      </div>

      <div className="bg-white border border-slate-300 rounded shadow-sm p-6">
        <p className="text-slate-600 text-sm">
          Broadcast important alerts and announcements to keep residents informed about infrastructure issues and updates.
        </p>
      </div>
    </div>
  );
}
