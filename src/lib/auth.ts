import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/env";
import type { AppRole } from "./supabase/database.types";
import { homeFor } from "./roles";

export type SessionUser = { id: string; email: string; role: AppRole; fullName: string | null; displayName: string | null; avatarUrl: string | null };

/** Current user verified with the Auth server (getUser), plus their role from public.users. */
/** Name shown across the app: display name, then full name, then the email prefix. */
export function publicName(user: Pick<SessionUser, "displayName" | "fullName" | "email">) {
  return user.displayName || user.fullName || user.email.split("@")[0];
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("users").select("role, full_name, display_name, avatar_url").eq("id", user.id).maybeSingle();
  return {
    id: user.id,
    email: user.email ?? "",
    role: profile?.role ?? "user",
    fullName: profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? null,
    displayName: profile?.display_name || null,
    avatarUrl: profile?.avatar_url ?? null,
  };
});

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export async function requireRole(roles: AppRole[], next?: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}
