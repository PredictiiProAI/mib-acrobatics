import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { requireRole, publicName } from "@/lib/auth";
import { getUnreadCount } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { PUBLISHER_ROLES, ROLE_LABEL, isStaff } from "@/lib/roles";
import { navFor } from "./nav";

export const metadata: Metadata = { title: "Command Center" };

async function count(table: "posts" | "users" | "comments", authorId?: string) {
  const supabase = await createClient();
  const { count } = authorId
    ? await supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", authorId)
    : await supabase.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

export default async function DashboardPage() {
  const user = await requireRole(PUBLISHER_ROLES, "/dashboard");
  const staff = isStaff(user.role);
  const [stats, unread] = await Promise.all([
    staff
      ? Promise.all([count("posts"), count("users"), count("comments")]).then(([p, u, c]) => [
          { label: "Postări", value: p },
          { label: "Utilizatori", value: u },
          { label: "Comentarii", value: c },
        ])
      : count("posts", user.id).then((v) => [{ label: "Postările mele", value: v }]),
    staff ? getUnreadCount(user.id) : Promise.resolve(0),
  ]);
  const badges: Record<string, number> = { "/dashboard/messages": unread };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black sm:text-4xl">
          Salut, <span className="text-gradient">{publicName(user)}</span>
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Rol: <span className="text-neon-orange">{ROLE_LABEL[user.role]}</span>
          {staff ? " — alege o secțiune de administrat." : " — poți încărca media și gestiona postările tale."}
        </p>
      </div>

      <div className={`grid gap-3 ${stats.length === 3 ? "grid-cols-3" : "grid-cols-1 sm:max-w-xs"}`}>
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/5 bg-[#161616] px-3 py-3 sm:p-5">
            <p className="truncate text-xs text-white/50 sm:text-sm">{s.label}</p>
            <p className="mt-1 font-display text-2xl font-black text-neon-orange sm:text-4xl">{s.value}</p>
          </div>
        ))}
      </div>

      <nav aria-label="Secțiuni admin" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="admin-grid">
        {navFor(user.role).map(({ label, href, icon: Icon, desc }) => (
          <Link
            key={label}
            href={href}
            data-testid="admin-card"
            className="group relative flex min-h-32 flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-[#161616] p-4 transition duration-150 hover:-translate-y-0.5 hover:border-neon-orange/70 hover:shadow-neon-sm focus-visible:border-neon-green focus-visible:outline-none active:scale-[0.97] active:border-neon-green"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-neon-orange/10 text-neon-orange transition group-hover:bg-neon-orange group-hover:text-black group-active:bg-neon-green group-active:text-black">
              <Icon className="size-6" />
            </span>
            <span>
              <span className="flex items-center justify-between gap-1 text-sm font-bold leading-tight sm:text-base">
                {label}
                <ChevronRight className="size-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-neon-green" />
              </span>
              <span className="mt-1 block text-xs leading-snug text-white/50">{desc}</span>
            </span>
            {(badges[href] ?? 0) > 0 && (
              <span className="absolute right-3 top-3 inline-grid min-w-6 place-items-center rounded-full bg-neon-green px-1.5 py-0.5 text-xs font-black text-black">
                {badges[href]}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
