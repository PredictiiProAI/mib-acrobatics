import type { AppRole } from "@/lib/supabase/database.types";

export type DashNavItem = { label: string; href: string; roles: AppRole[]; soon?: boolean };

const ALL_PUBLISHERS: AppRole[] = ["media", "admin", "superadmin"];
const STAFF: AppRole[] = ["admin", "superadmin"];

// media sees only Upload + own posts; admin/superadmin see everything.
export const DASH_NAV: DashNavItem[] = [
  { label: "Prezentare", href: "/dashboard", roles: ALL_PUBLISHERS },
  { label: "Upload Zone", href: "/dashboard/upload", roles: ALL_PUBLISHERS },
  { label: "Postările mele", href: "/dashboard/posts", roles: ["media"] },
  { label: "Moderare postări", href: "/dashboard/posts", roles: STAFF },
  { label: "Moderare comentarii", href: "/dashboard/comments", roles: STAFF },
  { label: "Utilizatori", href: "/dashboard/users", roles: STAFF },
  { label: "Mesaje", href: "/dashboard/messages", roles: STAFF },
];

export const navFor = (role: AppRole) => DASH_NAV.filter((i) => i.roles.includes(role));
