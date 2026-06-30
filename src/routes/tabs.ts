import { User } from "../types";

export type TabType =
  | "issues"
  | "campaigns"
  | "report"
  | "survey"
  | "contractor"
  | "admin-dashboard"
  | "admin-surveys"
  | "admin-announcements"
  | "leaderboard"
  | "map"
  | "profile";

export const VALID_TABS: TabType[] = [
  "issues",
  "campaigns",
  "report",
  "survey",
  "contractor",
  "admin-dashboard",
  "admin-surveys",
  "admin-announcements",
  "leaderboard",
  "map",
  "profile",
];

export function isValidTab(value: string | undefined): value is TabType {
  return !!value && (VALID_TABS as string[]).includes(value);
}

/** Default landing tab for a user's role. */
export function roleDefaultTab(user: User | null): TabType {
  if (!user) return "issues";
  if (user.role === "admin") return "admin-dashboard";
  if (user.role === "contractor") return "contractor";
  return "issues";
}
