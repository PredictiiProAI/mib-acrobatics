import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PUBLISHER_ROLES, ROLE_LABEL, isStaff } from "@/lib/roles";

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
  const stats = staff
    ? [
        { label: "Postări", value: await count("posts") },
        { label: "Utilizatori", value: await count("users") },
        { label: "Comentarii", value: await count("comments") },
      ]
    : [{ label: "Postările mele", value: await count("posts", user.id) }];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-neon-green">Command Center</p>
        <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">
          Salut, <span className="text-gradient">{user.fullName ?? user.email}</span>
        </h1>
        <p className="mt-2 text-white/60">
          Rol: <span className="text-neon-orange">{ROLE_LABEL[user.role]}</span>
          {staff ? " — ai acces complet: upload, moderare, utilizatori și mesaje." : " — poți încărca media și gestiona postările tale."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-6">
            <p className="text-sm text-white/50">{s.label}</p>
            <p className="mt-2 font-display text-4xl font-black text-neon-orange">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
