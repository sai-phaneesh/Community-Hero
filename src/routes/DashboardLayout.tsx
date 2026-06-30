import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Bell,
  LogOut,
  ClipboardList,
  Megaphone,
  PlusCircle,
  FileText,
  Sliders,
  TrendingUp,
  MessageSquare,
  MapPin,
  Award,
  UserCheck,
  MoreHorizontal,
  AlertCircle,
} from "lucide-react";
import { trpc } from "../frontend/trpc";
import { useWebPush } from "../frontend/hooks/useWebPush";
import { useOnlineStatus } from "../frontend/hooks/useOnlineStatus";
import { useAuth } from "../context/AuthContext";
import { TabType, isValidTab, roleDefaultTab } from "./tabs";

/**
 * Shared chrome for all authenticated /app/* routes: offline banner, top header
 * (with notification center + profile + logout), sidebar nav, mobile nav, and
 * footer. The matched page renders through <Outlet/>. Owns its own data via
 * tRPC queries (TanStack Query dedupes shared query keys with the pages).
 */
export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();

  const isOffline = useOnlineStatus();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const [prevNotifCount, setPrevNotifCount] = useState<number | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const { triggerPush } = useWebPush();

  const issuesQuery = trpc.issue.list.useInfiniteQuery(
    { limit: 10 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      refetchInterval: 10000,
    },
  );
  const issues = issuesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const notificationsQuery = trpc.notification.list.useQuery(
    { userId: user?.id ?? "" },
    { refetchInterval: 10000, enabled: !!user },
  );
  const notifications = notificationsQuery.data ?? [];
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const markAllReadMutation = trpc.notification.markAllRead.useMutation();
  const markNotifReadMutation = trpc.notification.read.useMutation();

  // Close notifications dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Web push when a new unread notification arrives
  useEffect(() => {
    if (notificationsQuery.data) {
      const unread = notificationsQuery.data.filter((n) => !n.read);
      if (prevNotifCount !== null && unread.length > prevNotifCount) {
        const latest = unread[0];
        if (latest) triggerPush(latest.title, latest.message);
      }
      setPrevNotifCount(unread.length);
    }
  }, [notificationsQuery.data, triggerPush, prevNotifCount]);

  if (!user) return null; // guarded by ProtectedRoute

  const activeTab: TabType = isValidTab(tab) ? tab : roleDefaultTab(user);
  const go = (next: TabType) => navigate(`/app/${next}`);

  const handleMarkNotifRead = async (id: string) => {
    try {
      await markNotifReadMutation.mutateAsync({ id });
      notificationsQuery.refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotifClick = (notif: (typeof notifications)[number]) => {
    handleMarkNotifRead(notif.id);
    if (notif.targetIssueId) {
      setShowNotifications(false);
      navigate("/app/issues");
      setTimeout(
        () => (window as any).__jumpToIssue?.(notif.targetIssueId),
        400,
      );
    }
  };

  const navBtn = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded transition-all ${
      active
        ? "bg-slate-900 text-white border border-slate-700 shadow-sm"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {isOffline && (
        <div className="bg-amber-500 text-white font-bold py-2 text-center text-xs flex items-center justify-center gap-2 shadow-md shrink-0 sticky top-0 z-999">
          <AlertCircle className="h-4 w-4 shrink-0 animate-bounce" />
          <span>
            Offline Mode: Showing read-only cached view. Actions are disabled
            until connection is restored.
          </span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 h-14 bg-slate-900 text-white flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center font-bold text-lg text-slate-950">
            W
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white uppercase flex items-center gap-1.5 leading-none">
              WARD<span className="text-emerald-400">WATCH</span>
            </h1>
            <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">
              Civic Action Terminal
            </span>
          </div>
          <span className="hidden md:inline-block ml-4 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-400 uppercase tracking-widest font-mono">
            Admin Terminal v2.4
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex gap-4">
            <div className="text-right">
              <p className="text-[9px] text-slate-400 uppercase font-mono">
                Civic Trust Score
              </p>
              <p className="text-emerald-400 font-mono text-xs font-bold">
                84.2%
              </p>
            </div>
            <div className="text-right border-l border-slate-700 pl-4">
              <p className="text-[9px] text-slate-400 uppercase font-mono">
                Active Tickets
              </p>
              <p className="text-emerald-400 font-mono text-xs font-bold">
                {issues.filter((i) => i.status !== "Resolved").length}
              </p>
            </div>
          </div>

          {/* Notifications Center */}
          <div
            className="relative border-l border-slate-700 pl-4"
            ref={notificationsRef}
          >
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded relative transition-all"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-emerald-500 text-slate-950 font-extrabold text-[9px] h-3.5 min-w-3.5 px-0.5 rounded-full flex items-center justify-center border border-slate-900">
                  {unreadNotifs}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-300 rounded shadow-xl p-4 max-h-96 overflow-y-auto z-50 text-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Notifications Feed
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        markAllReadMutation.mutate(
                          { userId: user.id },
                          { onSuccess: () => notificationsQuery.refetch() },
                        );
                      }}
                      className="text-[10px] font-mono text-emerald-600 hover:text-emerald-500 font-bold"
                    >
                      Mark All Read
                    </button>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-[10px] font-mono text-slate-500 hover:text-emerald-600"
                    >
                      Close
                    </button>
                  </div>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 font-mono">
                    No notifications yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={`p-2 rounded border text-left cursor-pointer transition-all ${
                          notif.read
                            ? "bg-slate-50 border-slate-200 text-slate-500"
                            : "bg-emerald-50/50 border-emerald-300 text-slate-800 hover:border-emerald-400"
                        }`}
                      >
                        <p className="text-xs font-semibold flex items-center gap-1">
                          {!notif.read && (
                            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full shrink-0"></span>
                          )}
                          {notif.title}
                        </p>
                        <p className="text-[11px] mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                        <span className="text-[9px] text-slate-500 font-mono block mt-1.5">
                          {new Date(notif.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Profile Info Tag */}
          <div
            className="hidden sm:flex items-center gap-2 border-l border-slate-700 pl-4 cursor-pointer hover:opacity-85 transition-all"
            onClick={() => go("profile")}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover border border-slate-600 shadow-sm"
              />
            ) : (
              <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-emerald-400 font-mono">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="text-[11px] text-left">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-slate-200">{user.name}</p>
                {user.points > 0 && (
                  <span className="text-[8px] bg-emerald-950/80 text-emerald-400 border border-emerald-900 px-1 rounded-sm font-mono font-bold leading-none py-0.5">
                    {user.points} XP
                  </span>
                )}
              </div>
              <p className="text-[9px] text-slate-400 font-mono leading-none mt-0.5">
                @{user.username || `user_${user.id}`} •{" "}
                {user.role === "resident"
                  ? user.residenceType === "owner"
                    ? "Homeowner"
                    : user.residenceType === "renter"
                      ? "Tenant"
                      : "Resident"
                  : user.role}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-all pl-4"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Sub-Nav & Layout Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row gap-4">
        <aside className="hidden md:flex md:w-64 shrink-0 flex-col gap-1.5">
          <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-2 mb-1">
            Navigation Menu
          </p>

          <button onClick={() => go("issues")} className={navBtn(activeTab === "issues")}>
            <ClipboardList className="h-3.5 w-3.5" />
            Issues Hub
          </button>

          <button onClick={() => go("campaigns")} className={navBtn(activeTab === "campaigns")}>
            <Megaphone className="h-3.5 w-3.5" />
            Campaigns & Events
          </button>

          {user.role === "resident" && (
            <>
              <button onClick={() => go("report")} className={navBtn(activeTab === "report")}>
                <PlusCircle className="h-3.5 w-3.5" />
                Report New Issue
              </button>
              <button onClick={() => go("survey")} className={navBtn(activeTab === "survey")}>
                <FileText className="h-3.5 w-3.5" />
                Monthly Well-being Survey
              </button>
            </>
          )}

          {user.role === "contractor" && (
            <button onClick={() => go("contractor")} className={navBtn(activeTab === "contractor")}>
              <Sliders className="h-3.5 w-3.5" />
              Contractor Workroom
            </button>
          )}

          {user.role === "admin" && (
            <>
              <button onClick={() => go("admin-dashboard")} className={navBtn(activeTab === "admin-dashboard")}>
                <TrendingUp className="h-3.5 w-3.5" />
                Governance & Analytics
              </button>
              <button onClick={() => go("admin-surveys")} className={navBtn(activeTab === "admin-surveys")}>
                <MessageSquare className="h-3.5 w-3.5" />
                Resident Well-being Inbox
              </button>
              <button onClick={() => go("admin-announcements")} className={navBtn(activeTab === "admin-announcements")}>
                <Megaphone className="h-3.5 w-3.5" />
                Alert Broadcast Console
              </button>
            </>
          )}

          <button onClick={() => go("map")} className={navBtn(activeTab === "map")}>
            <MapPin className="h-3.5 w-3.5" />
            Hyperlocal Map Hub
          </button>

          <button onClick={() => go("leaderboard")} className={navBtn(activeTab === "leaderboard")}>
            <Award className="h-3.5 w-3.5" />
            Civic Leaderboard
          </button>

          <button onClick={() => go("profile")} className={navBtn(activeTab === "profile")}>
            <UserCheck className="h-3.5 w-3.5" />
            My Profile Settings
          </button>

          <div className="mt-4 bg-white border border-slate-300 rounded p-3 text-left hidden md:block shadow-sm">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Community Statistics
            </h4>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Unresolved Issues</span>
                <span className="font-bold text-slate-900 font-mono">
                  {issues.filter((i) => i.status !== "Resolved").length}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Resolved to Date</span>
                <span className="font-bold text-slate-900 font-mono">
                  {issues.filter((i) => i.status === "Resolved").length}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-500">Active Handymen</span>
                <span className="font-bold text-slate-900 font-mono">
                  5 Registered
                </span>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 px-3 z-990 flex justify-around items-center shadow-lg">
        <button
          onClick={() => go("issues")}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors ${
            activeTab === "issues" ? "text-slate-900" : "text-slate-400"
          }`}
        >
          <ClipboardList className="h-4.5 w-4.5" />
          <span>Issues</span>
        </button>

        <button
          onClick={() => go("campaigns")}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors ${
            activeTab === "campaigns" ? "text-slate-900" : "text-slate-400"
          }`}
        >
          <Megaphone className="h-4.5 w-4.5" />
          <span>Campaigns</span>
        </button>

        {user.role === "resident" && (
          <button
            onClick={() => go("report")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors ${
              activeTab === "report" ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            <PlusCircle className="h-4.5 w-4.5" />
            <span>Report</span>
          </button>
        )}

        {user.role === "contractor" && (
          <button
            onClick={() => go("contractor")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors ${
              activeTab === "contractor" ? "text-indigo-600" : "text-slate-400"
            }`}
          >
            <Sliders className="h-4.5 w-4.5" />
            <span>Workroom</span>
          </button>
        )}

        {user.role === "admin" && (
          <button
            onClick={() => go("admin-dashboard")}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors ${
              activeTab === "admin-dashboard" ? "text-blue-600" : "text-slate-400"
            }`}
          >
            <TrendingUp className="h-4.5 w-4.5" />
            <span>Gov</span>
          </button>
        )}

        <button
          onClick={() => go("map")}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors ${
            activeTab === "map" ? "text-slate-900" : "text-slate-400"
          }`}
        >
          <MapPin className="h-4.5 w-4.5" />
          <span>Map</span>
        </button>

        <button
          onClick={() => go("profile")}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-colors ${
            activeTab === "profile" ? "text-slate-900" : "text-slate-400"
          }`}
        >
          <UserCheck className="h-4.5 w-4.5" />
          <span>Settings</span>
        </button>

        <button
          onClick={() => setShowMobileMoreMenu(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-slate-400 hover:text-slate-700 transition-colors"
        >
          <MoreHorizontal className="h-4.5 w-4.5" />
          <span>More</span>
        </button>
      </div>

      {/* Mobile More Drawer Sheet */}
      {showMobileMoreMenu && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-995 flex items-end justify-center p-0 animate-fadeIn"
          onClick={() => setShowMobileMoreMenu(false)}
        >
          <div
            className="bg-white border border-slate-300 rounded-t-2xl shadow-xl w-full p-5 pb-8 space-y-4 text-left animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                More Navigation Options
              </h3>
              <button
                onClick={() => setShowMobileMoreMenu(false)}
                className="text-sm font-bold text-slate-400 hover:text-slate-900 p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => {
                  go("leaderboard");
                  setShowMobileMoreMenu(false);
                }}
                className={`flex items-center gap-3 px-3 py-3 text-xs font-semibold rounded-lg border text-left transition-all ${
                  activeTab === "leaderboard"
                    ? "bg-slate-100 border-slate-400 text-slate-950"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Award className="h-4 w-4 text-emerald-600" />
                <span>Civic Leaderboard</span>
              </button>

              {user.role === "resident" && (
                <button
                  onClick={() => {
                    go("survey");
                    setShowMobileMoreMenu(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-3 text-xs font-semibold rounded-lg border text-left transition-all ${
                    activeTab === "survey"
                      ? "bg-slate-100 border-slate-400 text-slate-950"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Monthly Well-being Survey</span>
                </button>
              )}

              {user.role === "admin" && (
                <>
                  <button
                    onClick={() => {
                      go("admin-surveys");
                      setShowMobileMoreMenu(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-3 text-xs font-semibold rounded-lg border text-left transition-all ${
                      activeTab === "admin-surveys"
                        ? "bg-slate-100 border-slate-400 text-slate-950"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                    <span>Resident Inbox</span>
                  </button>
                  <button
                    onClick={() => {
                      go("admin-announcements");
                      setShowMobileMoreMenu(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-3 text-xs font-semibold rounded-lg border text-left transition-all ${
                      activeTab === "admin-announcements"
                        ? "bg-slate-100 border-slate-400 text-slate-950"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Megaphone className="h-4 w-4 text-rose-600" />
                    <span>Alert Broadcast Console</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Info bar */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-[10px] text-slate-400 font-mono uppercase tracking-widest">
        <p>
          WardWatch © {new Date().getFullYear()}. Empowering Neighborhood
          Transparency & Public Infrastructure Resolution.
        </p>
      </footer>
    </div>
  );
}
