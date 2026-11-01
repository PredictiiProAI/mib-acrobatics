"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import type { AppRole, Database } from "@/lib/supabase/database.types";
import { createAdminClient, removeUserFiles } from "@/lib/supabase/admin";
import { MEDIA_BUCKET } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./posts";

const ROLES: AppRole[] = ["superadmin", "admin", "media", "user"];

/** Role rules live in public.admin_set_role (admin: user <-> media only; superadmin: anything). */
export async function setUserRole(target: string, role: AppRole): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Nu ai acces la gestionarea utilizatorilor." };
  if (!ROLES.includes(role)) return { ok: false, error: "Rol invalid." };
  if (target === me.id) return { ok: false, error: "Nu îți poți schimba propriul rol." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { target, new_role: role });
  if (error) {
    return { ok: false, error: error.code === "42501" ? "Nu ai dreptul să atribui acest rol." : "Rolul nu a putut fi schimbat." };
  }
  revalidatePath("/dashboard/users");
  return { ok: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MISSING_KEY = "Lipsește SUPABASE_SERVICE_ROLE_KEY pe server (Vercel → Environment Variables).";

/** Mirrors public.admin_set_role: admins create user/media accounts, superadmin any role. */
function canGrant(me: AppRole, role: AppRole) {
  return me === "superadmin" || (me === "admin" && (role === "user" || role === "media"));
}

/** Creates a confirmed account via the Admin Auth API, so the staff session stays signed in. */
export async function createUser(input: { name: string; email: string; password: string; role: AppRole }): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Nu ai acces la gestionarea utilizatorilor." };
  const name = input.name.trim().slice(0, 120);
  const email = input.email.trim().toLowerCase();
  if (!name) return { ok: false, error: "Completează numele." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Email invalid." };
  if (input.password.length < 8) return { ok: false, error: "Parola trebuie să aibă cel puțin 8 caractere." };
  if (!ROLES.includes(input.role) || !canGrant(me.role, input.role)) return { ok: false, error: "Nu ai dreptul să atribui acest rol." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: MISSING_KEY };
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error || !data.user) {
    console.error("createUser", error?.message);
    const taken = error?.code === "email_exists" || /already/i.test(error?.message ?? "");
    const weak = error?.code === "weak_password";
    return { ok: false, error: taken ? "Există deja un cont cu acest email." : weak ? "Parola este prea slabă." : "Contul nu a putut fi creat." };
  }

  const id = data.user.id;
  const { error: profileError } = await admin.from("users").upsert({ id, email, full_name: name, role: input.role }, { onConflict: "id" });
  if (profileError) {
    console.error("createUser profile", profileError.message);
    await admin.auth.admin.deleteUser(id);
    return { ok: false, error: "Contul nu a putut fi creat." };
  }
  revalidatePath("/dashboard/users");
  return { ok: true };
}

/** Superadmin only: removes the auth account (public rows cascade) and the user's uploaded files. */
export async function deleteUser(target: string): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || me.role !== "superadmin") return { ok: false, error: "Doar Super Admin poate șterge utilizatori." };
  if (target === me.id) return { ok: false, error: "Nu îți poți șterge propriul cont." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: MISSING_KEY };

  await removeUserFiles(admin, target, [MEDIA_BUCKET, "avatars"]);

  const { error } = await admin.auth.admin.deleteUser(target);
  if (error) {
    console.error("deleteUser", error.message);
    return { ok: false, error: "Utilizatorul nu a putut fi șters." };
  }
  revalidatePath("/dashboard", "layout");
  revalidatePath("/feed");
  revalidatePath("/");
  return { ok: true };
}

export type UserActivity = {
  posts: { id: string; media_url: string; media_type: "image" | "video"; caption: string | null; created_at: string; is_public: boolean }[];
  comments: { id: string; content: string; created_at: string; post_caption: string | null }[];
};

/** Latest posts and comments of one user for the staff detail panel. */
export async function getUserActivity(target: string): Promise<UserActivity | null> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return null;
  const supabase = await createClient();
  const [posts, comments] = await Promise.all([
    supabase.from("posts").select("id, media_url, media_type, caption, created_at, is_public").eq("author_id", target).order("created_at", { ascending: false }).limit(12),
    supabase
      .from("comments")
      .select("id, content, created_at, post:posts!comments_post_id_fkey(caption)")
      .eq("user_id", target)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  if (posts.error) console.error("activity posts", posts.error.message);
  if (comments.error) console.error("activity comments", comments.error.message);
  return {
    posts: posts.data ?? [],
    comments: (comments.data ?? []).map((c) => ({ id: c.id, content: c.content, created_at: c.created_at, post_caption: c.post?.caption ?? null })),
  };
}

export type WaiverRecord = Database["public"]["Tables"]["waiver_submissions"]["Row"];

/** All waiver / medical-form submissions of one member, newest first (staff only). */
export async function getWaiverSubmissions(target: string): Promise<WaiverRecord[]> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("waiver_submissions").select("*").eq("user_id", target).order("signed_at", { ascending: false });
  if (error) console.error("getWaiverSubmissions", error.message);
  return data ?? [];
}
