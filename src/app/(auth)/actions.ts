"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { authErrorRo } from "@/lib/auth-errors";
import { homeFor, safeNext } from "@/lib/roles";
import { sendSignupAlert } from "@/lib/signup-alert";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** `step` tells the form which screen to show next: the 6-digit code (verify) or the new-password screen (reset). */
export type AuthState = { error?: string; message?: string; email?: string; step?: "verify" | "reset" } | undefined;

const NOT_CONFIGURED = "Supabase nu este configurat (NEXT_PUBLIC_SUPABASE_URL / KEY lipsesc).";
const CODE = /^\d{6}$/;

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

async function goHome(userId: string, next: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
  redirect(safeNext(next) ?? homeFor(profile?.role));
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Completează emailul și parola.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed") {
    // Account exists but was never verified: send a fresh code and switch to the code screen.
    const resend = await supabase.auth.resend({ type: "signup", email });
    if (resend.error && resend.error.code !== "over_email_send_rate_limit") return { error: authErrorRo(resend.error), email };
    return { step: "verify", email, message: "Contul nu este confirmat. Ți-am trimis un cod de 6 cifre pe email." };
  }
  if (error || !data.user) return { error: authErrorRo(error, "Email sau parolă greșită."), email };
  await goHome(data.user.id, field(formData, "next"));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  const fullName = field(formData, "full_name").slice(0, 120);
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!fullName || !email) return { error: "Completează numele și emailul.", email };
  if (password.length < 8) return { error: "Parola trebuie să aibă cel puțin 8 caractere.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) return { error: authErrorRo(error, "Nu am putut crea contul. Încearcă din nou."), email };
  // Supabase returns a user with no identities when the email is already registered.
  if (data.user && data.user.identities?.length === 0) return { error: authErrorRo({ code: "user_already_exists" }), email };

  after(() => sendSignupAlert({ email, fullName }));
  if (data.session) await goHome(data.session.user.id, field(formData, "next"));
  return { step: "verify", email, message: "Cont creat! Ți-am trimis un cod de 6 cifre pe email." };
}

/** Confirms the sign-up with the 6-digit code from the email and logs the user in. */
export async function verifySignupCode(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  const email = field(formData, "email").toLowerCase();
  const token = field(formData, "token");
  if (!CODE.test(token)) return { step: "verify", email, error: "Introdu codul de 6 cifre din email." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) return { step: "verify", email, error: authErrorRo(error ?? { code: "otp_expired" }, "Codul este greșit sau a expirat.") };
  await goHome(data.user.id, field(formData, "next"));
}

export async function resendCode(email: string, kind: "signup" | "recovery"): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured) return { ok: false, message: NOT_CONFIGURED };
  const supabase = await createClient();
  const clean = email.trim().toLowerCase();
  const { error } = kind === "signup" ? await supabase.auth.resend({ type: "signup", email: clean }) : await supabase.auth.resetPasswordForEmail(clean);
  return error ? { ok: false, message: authErrorRo(error) } : { ok: true, message: "Ți-am trimis un cod nou." };
}

/** Step 1 of "Am uitat parola": email a 6-digit recovery code. */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  const email = field(formData, "email").toLowerCase();
  if (!email) return { error: "Completează emailul." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error && error.code !== "user_not_found") return { error: authErrorRo(error), email };
  // Same answer whether or not the account exists, so the form can't be used to discover emails.
  return { step: "reset", email, message: "Dacă există un cont cu acest email, ți-am trimis un cod de 6 cifre." };
}

/** Step 2: verify the recovery code, set the new password and log in. */
export async function resetPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  const email = field(formData, "email").toLowerCase();
  const token = field(formData, "token");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  const again = (error: string): AuthState => ({ step: "reset", email, error });
  if (!CODE.test(token)) return again("Introdu codul de 6 cifre din email.");
  if (password.length < 8) return again("Parola trebuie să aibă cel puțin 8 caractere.");
  if (password !== confirm) return again("Parolele nu coincid.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
  if (error || !data.user) return again(authErrorRo(error ?? { code: "otp_expired" }, "Codul este greșit sau a expirat."));
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) return again(authErrorRo(updateError, "Parola nu a putut fi schimbată."));
  await goHome(data.user.id, "");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
