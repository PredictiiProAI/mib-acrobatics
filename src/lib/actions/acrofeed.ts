"use server";

import { revalidatePath } from "next/cache";
import { HERO_TEXT_MAX } from "@/lib/acrofeed";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./posts";

export async function saveHeroText(text: string): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Doar antrenorii pot modifica mesajul AcroFeed." };
  const value = text.trim();
  if (!value) return { ok: false, error: "Mesajul nu poate fi gol." };
  if (value.length > HERO_TEXT_MAX) return { ok: false, error: `Mesajul poate avea maxim ${HERO_TEXT_MAX} de caractere.` };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .update({ acrofeed_hero_text: value, updated_at: new Date().toISOString(), updated_by: me.id })
    .eq("id", true)
    .select("id");
  if (error || !data?.length) {
    console.error("saveHeroText", error?.message ?? "no settings row");
    return { ok: false, error: error ? "Mesajul nu a putut fi salvat." : "Lipsește rândul de setări (rulează migrarea 0011_app_settings.sql)." };
  }
  revalidatePath("/feed");
  revalidatePath("/dashboard/acrofeed");
  return { ok: true };
}
