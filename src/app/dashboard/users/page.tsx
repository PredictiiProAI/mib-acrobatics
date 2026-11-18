import type { Metadata } from "next";
import { MarkSeen } from "../mark-seen";
import { requireRole } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Utilizatori" };

export default async function UsersPage() {
  const me = await requireRole(STAFF_ROLES, "/dashboard/users");
  const supabase = await createClient();
  const [{ data: users, error }, { data: requests }, { data: posts }, { data: comments }, { data: assignments }, { data: classes }] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase.rpc("admin_document_requests"),
    supabase.from("posts").select("author_id"),
    supabase.from("comments").select("user_id"),
    supabase.rpc("admin_user_assignments"),
    supabase.from("schedule").select("group_name, sort_order").order("sort_order").order("group_name"),
  ]);
  if (error) console.error("admin_list_users", error.message);

  const tally = (ids: (string | undefined)[]) => ids.reduce<Record<string, number>>((acc, id) => (id ? { ...acc, [id]: (acc[id] ?? 0) + 1 } : acc), {});
  const postCount = tally((posts ?? []).map((p) => p.author_id));
  const commentCount = tally((comments ?? []).map((c) => c.user_id));
  const requestedAt = new Map((requests ?? []).map((r) => [r.id, r.documents_requested_at]));
  const assignment = new Map((assignments ?? []).map((a) => [a.id, a]));
  const byName = (a: string, b: string) => a.localeCompare(b, "ro");
  const options = {
    groups: [...new Set((classes ?? []).map((c) => c.group_name))],
    cities: [...new Set((assignments ?? []).map((a) => a.city?.trim()).filter((c): c is string => !!c))].sort(byName),
  };

  return (
    <div className="space-y-8">
      <MarkSeen section="users" />
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-neon-green">Comunitate</p>
        <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">Utilizatori</h1>
        <p className="mt-2 text-white/60">
          {me.role === "superadmin"
            ? "Ca Super Admin poți crea conturi cu orice rol, schimba roluri și șterge utilizatori."
            : "Poți crea conturi de Sportiv sau Media și transforma un sportiv în cont Media (și invers). Rolurile de Antrenor le atribuie doar Super Admin."}
        </p>
      </div>
      <UsersTable
        me={{ id: me.id, role: me.role }}
        users={(users ?? []).map((u) => ({ ...u, posts: postCount[u.id] ?? 0, comments: commentCount[u.id] ?? 0, documents_requested_at: requestedAt.get(u.id) ?? null,
          city: assignment.get(u.id)?.city ?? null,
          groups: assignment.get(u.id)?.groups ?? [],
        }))}
        options={options}
      />
    </div>
  );
}
