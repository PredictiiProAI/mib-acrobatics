import type { AppRole } from "./supabase/database.types";

export const STAFF_ROLES: AppRole[] = ["admin", "superadmin"];
export const PUBLISHER_ROLES: AppRole[] = ["media", "admin", "superadmin"];

export const isStaff = (role: AppRole | null | undefined) => !!role && STAFF_ROLES.includes(role);
export const canPublish = (role: AppRole | null | undefined) => !!role && PUBLISHER_ROLES.includes(role);

/** Where a user lands after login: publishers go to the command center, everyone else to the feed. */
export const homeFor = (role: AppRole | null | undefined) => (canPublish(role) ? "/dashboard" : "/feed");

export const ROLE_LABEL: Record<AppRole, string> = {
  superadmin: "Super Admin",
  admin: "Antrenor",
  media: "Media",
  user: "Sportiv",
};

/** Only allow same-origin relative paths as post-login targets. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
