"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { homeFor, safeNext } from "@/lib/roles";

export type AuthState = { error?: string; message?: string; email?: string } | undefined;

const NOT_CONFIGURED = "Supabase nu este configurat (NEXT_PUBLIC_SUPABASE_URL / KEY lipsesc).";

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Completează emailul și parola.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const msg = error?.code === "email_not_confirmed" ? "Confirmă-ți emailul înainte de autentificare." : "Email sau parolă greșită.";
    return { error: msg, email };
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", data.user.id).maybeSingle();
  redirect(safeNext(String(formData.get("next") ?? "")) ?? homeFor(profile?.role));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!fullName || !email) return { error: "Completează numele și emailul.", email };
  if (password.length < 8) return { error: "Parola trebuie să aibă cel puțin 8 caractere.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: `${await origin()}/auth/callback` },
  });
  if (error) {
    const msg = error.code === "weak_password" ? "Parola este prea slabă." : "Nu am putut crea contul. Încearcă din nou.";
    return { error: msg, email };
  }
  // Supabase returns a user with no identities when the email is already registered.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "Există deja un cont cu acest email. Autentifică-te.", email };
  }
  if (data.session) redirect("/feed");
  return { message: "Cont creat! Verifică emailul pentru linkul de confirmare.", email };
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
