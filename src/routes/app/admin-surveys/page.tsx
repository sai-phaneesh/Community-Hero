import { useAuth } from "../../../context/AuthContext";
import RoleGuard from "../../RoleGuard";

/**
 * Admin Surveys page - For admins to review survey responses
 */
export default function AdminSurveysPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold tracking-tight text-slate-900 font-sans">
          Resident Well-being Inbox
        </h2>
        <p className="text-slate-500 text-xs mt-0.5 font-sans">
          Review and analyze feedback from community surveys
        </p>
      </div>

      <div className="bg-white border border-slate-300 rounded shadow-sm p-6">
        <p className="text-slate-600 text-sm">
          View survey responses and community feedback to make informed decisions about neighborhood improvements.
        </p>
      </div>
    </div>
  );
}
