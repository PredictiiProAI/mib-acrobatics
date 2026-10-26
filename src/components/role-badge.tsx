import { ROLE_LABEL } from "@/lib/roles";
import type { AppRole } from "@/lib/supabase/database.types";

export const ROLE_BADGE_STYLE: Record<AppRole, string> = {
  superadmin: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/30",
  admin: "bg-neon-orange/15 text-neon-orange ring-neon-orange/30",
  media: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  user: "bg-neon-green/10 text-neon-green ring-neon-green/25",
};

export function RoleBadge({ role, className = "" }: { role: AppRole; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${ROLE_BADGE_STYLE[role]} ${className}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}
