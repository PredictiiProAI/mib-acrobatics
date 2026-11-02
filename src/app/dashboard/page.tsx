import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { requireRole, publicName } from "@/lib/auth";
import { getUnreadCount } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { PUBLISHER_ROLES, ROLE_LABEL, isStaff } from "@/lib/roles";
import { navFor } from "./nav";
import { seenAt } from "./seen";

export const metadata: Metadata = { title: "Command Center" };

async function count(table: "posts" | "users" | "comments", authorId?: string) {
  const supabase = await createClient();
  const { count } = authorId
    ? await supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", authorId)
    : await supabase.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

/** Items created in the last 24h that this admin has not seen yet (opening the section resets it). */
async function newUnseen(table: "posts" | "comments", userId: string) {
  const supabase = await createClient();
  const seen = await seenAt(table, userId);
  const since = new Date(Math.max(Date.now() - 24 * 3600 * 1000, seen ?? 0)).toISOString();
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).gt("created_at", since);
  return count ?? 0;
}

/** Members whose required document is missing (parents without the signed consent, athletes without the rules acknowledgement); after the first visit to Utilizatori, only accounts created since then. */
async function membersMissingDocs(userId: string) {
  const supabase = await createClient();
  const [{ data, error }, seen] = await Promise.all([supabase.rpc("admin_list_users"), seenAt("users", userId)]);
  if (error || !data) return 0;
  return data.filter(
    (u) => u.role === "user" && (u.account_type === "Părinte" ? !u.waiver_signed : !u.rules_accepted_at) && (seen === null || Date.parse(u.created_at) > seen),
  ).length;
}

const BADGES: Record<string, { load: (uid: string) => Promise<number>; title: (n: number) => string }> = {
  "/dashboard/messages": { load: getUnreadCount, title: (n) => `${n} ${n === 1 ? "mesaj necitit" : "mesaje necitite"}` },
  "/dashboard/users": { load: membersMissingDocs, title: (n) => `${n} ${n === 1 ? "membru nou" : "membri noi"} cu documente lipsă` },
  "/dashboard/posts": { load: (uid) => newUnseen("posts", uid), title: (n) => `${n} ${n === 1 ? "postare nouă" : "postări noi"} ` },
  "/dashboard/comments": { load: (uid) => newUnseen("comments", uid), title: (n) => `${n} ${n === 1 ? "comentariu nou" : "comentarii noi"} ` },
};

async function CardBadge({ href, userId }: { href: string; userId: string }) {
  const badge = BADGES[href];
  const n = await badge.load(userId).catch(() => 0);
  if (n <= 0) return null;
  return (
    <span
      role="status"
      aria-label={badge.title(n)}
      title={badge.title(n)}
      data-testid="card-badge"
      className="absolute -right-1.5 -top-1.5 z-10 inline-grid h-7 min-w-7 animate-[pop-in_.25s_ease-out] place-items-center rounded-full bg-neon-orange px-2 text-xs font-black tabular-nums text-onaccent shadow-[0_0_0_3px_var(--color-ink),0_0_14px_rgb(255_106_0/0.6)]"
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

async function Stats({ staff, userId }: { staff: boolean; userId: string }) {
  const stats = staff
    ? await Promise.all([count("posts"), count("users"), count("comments")]).then(([p, u, c]) => [
        { label: "Postări", value: p },
        { label: "Utilizatori", value: u },
        { label: "Comentarii", value: c },
      ])
    : [{ label: "Postările mele", value: await count("posts", userId) }];
  return <StatGrid stats={stats} />;
}

function StatGrid({ stats }: { stats: { label: string; value: number | null }[] }) {
  return (
    <div className={`grid gap-3 ${stats.length === 3 ? "grid-cols-3" : "grid-cols-1 sm:max-w-xs"}`}>
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-white/5 bg-surface px-3 py-3 shadow-card sm:p-5">
          <p className="truncate text-xs text-white/50 sm:text-sm">{s.label}</p>
          {s.value === null ? (
            <div className="mt-2 h-7 w-10 animate-pulse rounded-lg bg-white/10 sm:h-10" />
          ) : (
            <p className="mt-1 font-display text-2xl font-black text-neon-orange sm:text-4xl">{s.value}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireRole(PUBLISHER_ROLES, "/dashboard");
  const staff = isStaff(user.role);
  const statsFallback = (staff ? ["Postări", "Utilizatori", "Comentarii"] : ["Postările mele"]).map((label) => ({ label, value: null }));

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

      <Suspense fallback={<StatGrid stats={statsFallback} />}>
        <Stats staff={staff} userId={user.id} />
      </Suspense>

      <nav aria-label="Secțiuni admin" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="admin-grid">
        {navFor(user.role).map(({ label, href, icon: Icon, desc }) => (
          <Link
            key={label}
            href={href}
            data-testid="admin-card"
            className="group relative flex min-h-32 flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-surface p-4 shadow-card transition duration-150 hover:-translate-y-0.5 hover:border-neon-orange/70 hover:shadow-neon-sm focus-visible:border-neon-green focus-visible:outline-none active:scale-[0.97] active:border-neon-green"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-neon-orange/10 text-neon-orange transition group-hover:bg-neon-orange group-hover:text-onaccent group-active:bg-neon-green group-active:text-onaccent">
              <Icon className="size-6" />
            </span>
            <span>
              <span className="flex items-center justify-between gap-1 text-sm font-bold leading-tight sm:text-base">
                {label}
                <ChevronRight className="size-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-neon-green" />
              </span>
              <span className="mt-1 block text-xs leading-snug text-white/50">{desc}</span>
            </span>
            {staff && BADGES[href] && (
              <Suspense fallback={null}>
                <CardBadge href={href} userId={user.id} />
              </Suspense>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
