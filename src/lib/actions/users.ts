"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import type { AppRole, Database } from "@/lib/supabase/database.types";
import { createAdminClient, removeUserFiles } from "@/lib/supabase/admin";
import { LEVELS } from "@/lib/profile";
import { sendPush } from "@/lib/push.server";
import { sendDocumentsRequest } from "@/lib/signup-alert";
import { MEDIA_BUCKET } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./posts";

const ROLES: AppRole[] = ["superadmin", "admin", "media", "user"];

export type MemberType = "Sportiv" | "Părinte";
const MIGRATION_0018 = "Rulează migrarea 0018_signup_account_type.sql în Supabase.";

/** Role rules live in public.admin_set_role (admin: user <-> media only; superadmin: anything). Părinte = role user + account_type. */
export async function setUserRole(target: string, role: AppRole, memberType?: MemberType): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Nu ai acces la gestionarea utilizatorilor." };
  if (!ROLES.includes(role)) return { ok: false, error: "Rol invalid." };
  if (target === me.id) return { ok: false, error: "Nu îți poți schimba propriul rol." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { target, new_role: role });
  if (error) {
    return { ok: false, error: error.code === "42501" ? "Nu ai dreptul să atribui acest rol." : "Rolul nu a putut fi schimbat." };
  }
  if (role === "user" && memberType) {
    const { error: typeError } = await supabase.rpc("admin_set_account_type", { target, new_type: memberType });
    if (typeError) {
      console.error("admin_set_account_type", typeError.message);
      return { ok: false, error: typeError.code === "PGRST202" ? MIGRATION_0018 : "Tipul contului nu a putut fi schimbat." };
    }
  }
  revalidatePath("/dashboard/users");
  return { ok: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MISSING_KEY = "Lipsește SUPABASE_SERVICE_ROLE_KEY pe server (Vercel → Environment Variables).";

const cleanCity = (city: unknown) => (typeof city === "string" ? city.trim().slice(0, 80) : "") || null;
const cleanGroups = (groups: unknown) =>
  Array.isArray(groups) ? [...new Set(groups.filter((g): g is string => typeof g === "string").map((g) => g.trim().slice(0, 80)).filter(Boolean))].slice(0, 30) : [];

/** Staff only (enforced again in public.admin_set_user_assignment): a member's city and groups/schools. */
export async function setUserAssignment(target: string, city: string, groups: string[]): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Doar antrenorii pot schimba orașul și grupele." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_assignment", { target, p_city: cleanCity(city), p_groups: cleanGroups(groups) });
  if (error) {
    console.error("admin_set_user_assignment", error.message);
    return { ok: false, error: error.code === "PGRST202" ? "Rulează migrarea 0025_city_groups.sql în Supabase." : "Orașul și grupele nu au putut fi salvate." };
  }
  revalidatePath("/dashboard/users");
  revalidatePath("/profil");
  return { ok: true };
}

export type ProfileFieldsInput = {
  phone: string;
  discipline: string;
  level: string;
  birthdate: string;
  children_names: string;
  emergency_contact: string;
  city: string;
  groups: string[];
};

/** Staff only: fill in a member's profile fields and city/groups (both RPCs re-check staff in the database). */
export async function updateUserProfile(target: string, input: ProfileFieldsInput): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Doar antrenorii pot modifica profilul altui membru." };
  const phone = input.phone.trim();
  if (phone && !/^\+?[0-9 ()./-]{6,20}$/.test(phone)) return { ok: false, error: "Număr de telefon invalid." };
  if (input.level && !(LEVELS as string[]).includes(input.level)) return { ok: false, error: "Nivel invalid." };
  const birthdate = input.birthdate.trim();
  if (birthdate && (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate) || birthdate < "1900-01-01" || Number.isNaN(Date.parse(birthdate)))) return { ok: false, error: "Data nașterii este invalidă." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_profile", {
    target,
    p_phone: phone || null,
    p_discipline: input.discipline.trim().slice(0, 80) || null,
    p_level: input.level || null,
    p_birthdate: birthdate || null,
    p_children_names: input.children_names.trim().slice(0, 300) || null,
    p_emergency_contact: input.emergency_contact.trim().slice(0, 200) || null,
  });
  if (error) {
    console.error("admin_update_profile", error.message);
    return { ok: false, error: error.code === "PGRST202" ? "Rulează migrarea 0026_admin_profile_dm_media.sql în Supabase." : "Profilul nu a putut fi salvat." };
  }
  return setUserAssignment(target, input.city, input.groups);
}

/** Sends a test notification only to the signed-in staff member's own devices. */
const PLATFORM_LABEL: Record<string, string> = { android: "Android", ios: "iPhone", web: "browser" };

/** Test push to the signed-in staff member's own devices, or to one chosen member's devices. */
export async function sendTestPush(target?: string): Promise<ActionResult & { sent?: number; devices?: number; summary?: string }> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Nu ai acces." };
  if (target !== undefined && !UUID_RE.test(target)) return { ok: false, error: "Utilizator invalid." };
  const self = !target || target === me.id;
  const res = await sendPush([target ?? me.id], {
    title: "Test MIB Acrobatics",
    body: "Notificările push funcționează pe acest dispozitiv.",
    url: self ? "/dashboard/users" : "/profil",
    tag: "test-push",
  });
  if (res.skipped === "FIREBASE_SERVICE_ACCOUNT missing") return { ok: false, error: "Lipsește FIREBASE_SERVICE_ACCOUNT pe server (Vercel)." };
  if (res.skipped) return { ok: false, error: `Notificarea nu a fost trimisă: ${res.skipped}` };
  if (!res.tokens)
    return {
      ok: false,
      error: self
        ? "Nu ai niciun dispozitiv înregistrat pe contul tău. Activează notificările push din /profil, logat cu acest cont."
        : "Utilizatorul nu are niciun dispozitiv cu notificări push activate.",
    };
  if (!res.sent) return { ok: false, error: `Trimiterea a eșuat pe toate cele ${res.tokens} dispozitive.` };
  const summary = Object.entries(res.platforms ?? {})
    .map(([p, n]) => `${n} ${PLATFORM_LABEL[p] ?? p}`)
    .join(", ");
  return { ok: true, sent: res.sent, devices: res.tokens, summary };
}

/** Mirrors public.admin_set_role: admins create user/media accounts, superadmin any role. */
function canGrant(me: AppRole, role: AppRole) {
  return me === "superadmin" || (me === "admin" && (role === "user" || role === "media"));
}

/** Creates a confirmed account via the Admin Auth API, so the staff session stays signed in. */
export async function createUser(input: { name: string; email: string; password: string; role: AppRole; memberType?: MemberType; city?: string; groups?: string[] }): Promise<ActionResult> {
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
  const { error: profileError } = await admin.from("users").upsert(
      {
        id,
        email,
        full_name: name,
        role: input.role,
        account_type: input.role === "user" && input.memberType === "Părinte" ? "Părinte" : "Sportiv",
        city: cleanCity(input.city),
        groups: cleanGroups(input.groups),
      },
      { onConflict: "id" },
    );
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

/** Asks a member to complete the missing parental consent / rules (0022): email + forced /documente until done. */
export async function requestDocuments(target: string): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Nu ai acces la gestionarea utilizatorilor." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_request_documents", { target });
  if (error) {
    console.error("admin_request_documents", error.message);
    return { ok: false, error: error.code === "PGRST202" ? "Rulează migrarea 0022_document_requests.sql în Supabase." : "Cererea nu a putut fi trimisă." };
  }
  const u = data?.[0];
  if (!u) return { ok: false, error: "Doar sportivii și părinții completează documente." };
  after(() => sendDocumentsRequest({ to: u.email, name: u.full_name ?? "", parent: u.account_type === "Părinte" }));
  revalidatePath("/dashboard/users");
  return { ok: true };
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

/** Staff: personalised push to the selected members, optionally also saved as a private message from the sender. */
export async function sendBulkNotification(input: { userIds: string[]; title: string; body: string; asMessage: boolean }): Promise<ActionResult & { recipients?: number; withDevice?: number; sent?: number }> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Nu ai acces." };
  const ids = [...new Set(Array.isArray(input.userIds) ? input.userIds : [])].filter((id) => typeof id === "string" && UUID_RE.test(id) && id !== me.id);
  const title = (input.title ?? "").trim().slice(0, 80) || "MIB Acrobatics";
  const body = (input.body ?? "").trim().slice(0, 1000);
  if (!ids.length) return { ok: false, error: "Selectează cel puțin un utilizator." };
  if (ids.length > 500) return { ok: false, error: "Poți trimite la cel mult 500 de utilizatori odată." };
  if (!body) return { ok: false, error: "Scrie mesajul." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: MISSING_KEY };

  if (input.asMessage) {
    const content = title === "MIB Acrobatics" ? body : `${title}\n${body}`;
    const { error } = await admin.from("direct_messages").insert(ids.map((receiver_id) => ({ sender_id: me.id, receiver_id, content })));
    if (error) {
      console.error("sendBulkNotification messages", error.message);
      return { ok: false, error: "Mesajele nu au putut fi salvate." };
    }
  }
  const res = await sendPush(ids, { title, body: body.length > 180 ? `${body.slice(0, 177)}…` : body, url: input.asMessage ? `/messages/${me.id}` : "/feed", tag: `bulk-${Date.now()}` });
  if (res.skipped === "FIREBASE_SERVICE_ACCOUNT missing") return { ok: false, error: "Lipsește FIREBASE_SERVICE_ACCOUNT pe server (Vercel)." };
  return { ok: true, recipients: ids.length, withDevice: res.recipients, sent: res.sent };
}
