import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Utilizatori" };

export default async function UsersPage() {
  const me = await requireRole(STAFF_ROLES, "/dashboard/users");
  const supabase = await createClient();
  const [{ data: users, error }, { data: posts }, { data: comments }] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.from("posts").select("author_id"),
    supabase.from("comments").select("user_id"),
  ]);
  if (error) console.error("admin_list_users", error.message);

  const tally = (ids: (string | undefined)[]) => ids.reduce<Record<string, number>>((acc, id) => (id ? { ...acc, [id]: (acc[id] ?? 0) + 1 } : acc), {});
  const postCount = tally((posts ?? []).map((p) => p.author_id));
  const commentCount = tally((comments ?? []).map((c) => c.user_id));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-neon-green">Comunitate</p>
        <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">Utilizatori</h1>
        <p className="mt-2 text-white/60">
          {me.role === "superadmin"
            ? "Ca Super Admin poți atribui orice rol."
            : "Poți transforma un sportiv în cont Media (și invers). Rolurile de Antrenor le atribuie doar Super Admin."}
        </p>
      </div>
      <UsersTable
        me={{ id: me.id, role: me.role }}
        users={(users ?? []).map((u) => ({ ...u, posts: postCount[u.id] ?? 0, comments: commentCount[u.id] ?? 0 }))}
      />
    </div>
  );
}
