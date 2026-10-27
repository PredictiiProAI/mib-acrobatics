"use client";

import { Loader2, MessageSquare, Search } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { ROLE_BADGE_STYLE } from "@/components/role-badge";
import { setUserRole } from "@/lib/actions/users";
import { isStaff, ROLE_LABEL } from "@/lib/roles";
import type { AppRole } from "@/lib/supabase/database.types";

type Row = { id: string; email: string; role: AppRole; full_name: string | null; created_at: string; posts: number; comments: number };

const ALL_ROLES: AppRole[] = ["superadmin", "admin", "media", "user"];
const dateFmt = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", year: "numeric" });

/** Mirrors public.admin_set_role so the UI only offers changes the database will accept. */
function assignableRoles(me: { id: string; role: AppRole }, target: Row): AppRole[] {
  if (target.id === me.id) return [];
  if (me.role === "superadmin") return ALL_ROLES;
  if (me.role === "admin" && !isStaff(target.role)) return ["user", "media"];
  return [];
}

function RoleCell({ me, user }: { me: { id: string; role: AppRole }; user: Row }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const options = assignableRoles(me, user);
  if (!options.length) return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE_STYLE[user.role]}`}>{ROLE_LABEL[user.role]}</span>;
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={`Rol pentru ${user.full_name ?? user.email}`}
        value={user.role}
        disabled={pending}
        onChange={async (e) => {
          const role = e.target.value as AppRole;
          if (role === "admin" || role === "superadmin") {
            const ok = await confirm({
              tone: "warning",
              title: `Dai rolul ${ROLE_LABEL[role]}?`,
              description: `${user.full_name ?? user.email} va avea acces complet: moderare, utilizatori și toate conversațiile.`,
              confirmLabel: `Da, fă-l ${ROLE_LABEL[role]}`,
            });
            if (!ok) return;
          }
          startTransition(async () => {
            setError(null);
            const r = await setUserRole(user.id, role);
            if (!r.ok) setError(r.error);
          });
        }}
        className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ring-1 ring-white/10 focus:ring-neon-violet/60 ${ROLE_BADGE_STYLE[user.role]}`}
      >
        {options.map((r) => (
          <option key={r} value={r} className="bg-graphite text-white">
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="size-4 animate-spin text-white/50" />}
      {error && <span className="text-xs text-red-300">{error}</span>}
      {confirmDialog}
    </div>
  );
}

export function UsersTable({ me, users }: { me: { id: string; role: AppRole }; users: Row[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AppRole | "all">("all");
  const q = query.trim().toLowerCase();
  const rows = users.filter(
    (u) => (filter === "all" || u.role === filter) && (!q || u.email.toLowerCase().includes(q) || (u.full_name ?? "").toLowerCase().includes(q)),
  );
  const counts = ALL_ROLES.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r]: users.filter((u) => u.role === r).length }), {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-60 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm focus-within:border-neon-violet/70">
          <Search className="size-4 text-white/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Caută după nume sau email…" className="w-full bg-transparent outline-none placeholder:text-white/30" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...ALL_ROLES] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilter(r)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === r ? "bg-neon-violet text-black" : "bg-white/5 text-white/60 hover:text-white"}`}
            >
              {r === "all" ? `Toți (${users.length})` : `${ROLE_LABEL[r]} (${counts[r]})`}
            </button>
          ))}
        </div>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-white/5 text-xs uppercase tracking-wider text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">Utilizator</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Activitate</th>
              <th className="px-4 py-3 font-medium">Înscris</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5" data-testid="users-table">
            {rows.map((u) => (
              <tr key={u.id} className="transition hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neon-violet to-neon-purple text-sm font-black text-black">
                      {(u.full_name || u.email)[0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {u.full_name || "—"} {u.id === me.id && <span className="text-xs font-normal text-white/40">(tu)</span>}
                      </p>
                      <p className="truncate text-xs text-white/50">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RoleCell me={me} user={u} />
                </td>
                <td className="px-4 py-3 text-xs text-white/60">
                  {u.posts} postări · {u.comments} comentarii
                </td>
                <td className="px-4 py-3 text-xs text-white/60">{dateFmt.format(new Date(u.created_at))}</td>
                <td className="px-4 py-3 text-right">
                  {!isStaff(u.role) && u.id !== me.id && (
                    <Link
                      href={`/dashboard/messages/${u.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-neon-violet/50 hover:text-neon-violet"
                    >
                      <MessageSquare className="size-3.5" /> Mesaj
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-white/50">
                  Niciun utilizator găsit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
