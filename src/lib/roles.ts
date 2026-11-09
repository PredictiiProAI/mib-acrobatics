import type { AppRole } from "./supabase/database.types";

export const STAFF_ROLES: AppRole[] = ["admin", "superadmin"];
export const PUBLISHER_ROLES: AppRole[] = ["media", "admin", "superadmin"];

export const isStaff = (role: AppRole | null | undefined) => !!role && STAFF_ROLES.includes(role);
export const canPublish = (role: AppRole | null | undefined) => !!role && PUBLISHER_ROLES.includes(role);

/** Only member accounts (Sportiv / Părinte) must sign the waiver; staff and media are exempt. */
export const needsWaiver = (role: AppRole | null | undefined) => role === "user";

/** Where a user lands after login: publishers go to the command center, everyone else to the feed. */
export const homeFor = (role: AppRole | null | undefined) => (canPublish(role) ? "/dashboard" : "/feed");

/** Public label: Super Admin accounts are shown as coaches; their rights stay superadmin (see ADMIN_ROLE_LABEL in the users CRM). */
export const ROLE_LABEL: Record<AppRole, string> = {
  superadmin: "Antrenor",
  admin: "Antrenor",
  media: "Media",
  user: "Sportiv",
};

/** Role names in the users CRM, where the permission level must be told apart. */
export const ADMIN_ROLE_LABEL: Record<AppRole, string> = { ...ROLE_LABEL, superadmin: "Antrenor · Super Admin" };

/** Only allow same-origin relative paths as post-login targets. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
