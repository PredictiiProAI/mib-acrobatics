import { ROLE_LABEL } from "@/lib/roles";
import type { AppRole } from "@/lib/supabase/database.types";

export const ROLE_BADGE_STYLE: Record<AppRole, string> = {
  superadmin: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
  admin: "bg-neon-violet/15 text-neon-violet ring-neon-violet/30",
  media: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  user: "bg-white/[0.06] text-white/75 ring-white/15",
};

export function RoleBadge({ role, className = "" }: { role: AppRole; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${ROLE_BADGE_STYLE[role]} ${className}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}
