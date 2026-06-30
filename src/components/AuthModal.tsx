import React, { useState } from "react";
import { User } from "../types";
import {
  LogIn,
  UserPlus,
  Home,
  Hammer,
  ShieldAlert,
  Sparkles,
  AlertCircle,
  Sun,
  Moon,
} from "lucide-react";
import { trpc } from "../frontend/trpc";
import { toast } from "sonner";

interface AuthModalProps {
  onLoginSuccess: (user: User) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export default function AuthModal({
  onLoginSuccess,
  theme,
  toggleTheme,
}: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"resident" | "contractor" | "admin">(
    "resident",
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [specialty, setSpecialty] = useState("Plumber");
  const [residenceType, setResidenceType] = useState<"owner" | "renter" | "">(
    "",
  );
  const [residenceStartDate, setResidenceStartDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    {
      label: "Sign in as Resident (John)",
      email: "john@resident.com",
      pass: "john123",
      role: "Resident",
    },
    {
      label: "Sign in as Plumber (Bob)",
      email: "plumber@service.com",
      pass: "plumber123",
      role: "Contractor",
    },
    {
      label: "Sign in as Sparky (Electrician)",
      email: "electrician@service.com",
      pass: "electrician123",
      role: "Contractor",
    },
    {
      label: "Sign in as Elected Official (Admin)",
      email: "admin@community.org",
      pass: "admin123",
      role: "Administrator",
    },
  ];

  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setLoading(true);
    setError("");
    const toastId = toast.loading("Accessing democracy playground...");
    try {
      const res = await loginMutation.mutateAsync({
        email: demoEmail,
        password: demoPass,
      });
      localStorage.setItem("community_hero_token", res.token);
      toast.success(`Access granted! Welcome, ${res.user.name}`, {
        id: toastId,
      });
      onLoginSuccess(res.user as User);
    } catch (err: any) {
      const errMsg = err.message || "Login failed";
      setError(errMsg);
      toast.error(errMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // --- CLIENT SIDE INLINE VALIDATIONS ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      toast.error("Invalid email format.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      toast.error("Password is too short.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading(
      isRegister ? "Registering civic account..." : "Verifying credentials...",
    );

    try {
      if (isRegister) {
        const res = await registerMutation.mutateAsync({
          email,
          password,
        });
        localStorage.setItem("community_hero_token", res.token);
        toast.success(`Account registered! Welcome, ${res.user.name}`, {
          id: toastId,
        });
        onLoginSuccess(res.user as User);
      } else {
        const res = await loginMutation.mutateAsync({ email, password });
        localStorage.setItem("community_hero_token", res.token);
        toast.success(`Sign-in verified! Welcome back, ${res.user.name}`, {
          id: toastId,
        });
        onLoginSuccess(res.user as User);
      }
    } catch (err: any) {
      const errMsg = err.message || "Authentication failed.";
      setError(errMsg);
      toast.error(errMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* High Density styled subtle background grid */}
      <div className="absolute inset-0 opacity-10 dark:opacity-5 bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>

      <div className="relative max-w-md w-full space-y-6 bg-white dark:bg-slate-900 p-6 rounded border border-slate-300 dark:border-slate-800 shadow-md">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded bg-slate-900 dark:bg-slate-800 text-emerald-400 border border-slate-700 dark:border-slate-650 mb-3">
            <span className="font-bold text-lg">W</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
            WARD<span className="text-emerald-600">WATCH</span>
          </h2>
          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
            Community Hero Platform v1.0
          </span>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Civic action & problem solving
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-900/50 text-red-800 dark:text-red-300 p-2.5 rounded text-xs">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => {
              setIsRegister(false);
              setError("");
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded transition-all duration-150 cursor-pointer ${
              !isRegister
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-800"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsRegister(true);
              setError("");
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded transition-all duration-150 cursor-pointer ${
              isRegister
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-800"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Join Platform
          </button>
        </div>

        <form className="mt-4 space-y-3.5" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@example.com"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded py-2 px-3 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500 dark:focus:border-slate-400"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded py-2 px-3 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500 dark:focus:border-slate-400"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 bg-slate-900 text-white font-semibold py-2.5 rounded hover:bg-slate-800 active:scale-[0.98] transition-all text-xs shadow-sm disabled:opacity-50 disabled:pointer-events-none mt-4"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isRegister ? (
              <>
                <UserPlus className="h-3.5 w-3.5" />
                Create Account
              </>
            ) : (
              <>
                <LogIn className="h-3.5 w-3.5" />
                Sign In to Platform
              </>
            )}
          </button>
        </form>

        {/* Preset Quick Login Buttons */}
        <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
          <p className="text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
            Democracy Playgrounds (Quick Demo Login)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {demoAccounts.map((account, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleDemoLogin(account.email, account.pass)}
                disabled={loading}
                className="flex flex-col items-start p-2 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all group cursor-pointer"
              >
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450">
                  {account.role}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-350 font-mono mt-0.5">
                  {account.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
