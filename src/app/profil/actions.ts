"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { authErrorRo } from "@/lib/auth-errors";
import { LEVELS } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/supabase/env";
import type { TrainingLevel } from "@/lib/supabase/database.types";

export type FormState = { ok?: boolean; error?: string; message?: string } | undefined;

const PHONE = /^\+?[0-9 ()./-]{6,20}$/;
const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export async function saveProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/profil");
  const fullName = text(fd, "full_name");
  const displayName = text(fd, "display_name");
  const discipline = text(fd, "discipline");
  const level = text(fd, "level") as TrainingLevel | "";
  const phone = text(fd, "phone");

  if (!fullName) return { error: "Completează numele complet." };
  if (fullName.length > 120) return { error: "Numele complet poate avea cel mult 120 de caractere." };
  if (displayName.length > 60) return { error: "Numele de afișare poate avea cel mult 60 de caractere." };
  if (discipline.length > 80) return { error: "Disciplina poate avea cel mult 80 de caractere." };
  if (level && !LEVELS.includes(level)) return { error: "Alege un nivel de pregătire valid." };
  if (phone && !PHONE.test(phone)) return { error: "Numărul de telefon nu este valid." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ full_name: fullName, display_name: displayName || null, discipline: discipline || null, level: level || null })
    .eq("id", user.id);
  if (error) return { error: "Nu am putut salva profilul. Încearcă din nou." };

  const { error: settingsError } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, phone: phone || null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (settingsError) return { error: "Nu am putut salva numărul de telefon." };

  revalidatePath("/", "layout");
  return { ok: true, message: "Modificările au fost salvate." };
}

/** Records the avatar the browser just uploaded to `avatars/<uid>/…` and removes older files. */
export async function setAvatar(url: string | null): Promise<{ error?: string }> {
  const user = await requireUser("/profil");
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`;
  if (url !== null && (!url.startsWith(prefix) || url.length > 500)) return { error: "Imagine invalidă." };

  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { error: "Nu am putut salva poza de profil." };

  const keep = url?.slice(prefix.length);
  const { data: files } = await supabase.storage.from("avatars").list(user.id);
  const stale = (files ?? []).filter((f) => f.name !== keep).map((f) => `${user.id}/${f.name}`);
  if (stale.length) await supabase.storage.from("avatars").remove(stale);

  revalidatePath("/", "layout");
  return {};
}

export async function setNotification(key: "notify_feed" | "notify_schedule", value: boolean): Promise<{ error?: string }> {
  const user = await requireUser("/profil");
  if (key !== "notify_feed" && key !== "notify_schedule") return { error: "Setare necunoscută." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, ...(key === "notify_feed" ? { notify_feed: value === true } : { notify_schedule: value === true }), updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  return error ? { error: "Nu am putut salva preferința." } : {};
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/profil");
  const current = String(fd.get("current_password") ?? "");
  const next = String(fd.get("new_password") ?? "");
  const confirm = String(fd.get("confirm_password") ?? "");

  if (!current) return { error: "Introdu parola curentă." };
  if (next.length < 8) return { error: "Parola nouă trebuie să aibă cel puțin 8 caractere." };
  if (next !== confirm) return { error: "Parolele noi nu coincid." };
  if (next === current) return { error: "Parola nouă trebuie să fie diferită de cea curentă." };

  const supabase = await createClient();
  const { error: checkError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (checkError) return { error: checkError.code === "invalid_credentials" ? "Parola curentă este greșită." : authErrorRo(checkError) };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: authErrorRo(error, "Nu am putut schimba parola.") };
  return { ok: true, message: "Parola a fost schimbată." };
}
