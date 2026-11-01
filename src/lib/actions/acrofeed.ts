"use server";

import { revalidatePath } from "next/cache";
import {
  ANNOUNCEMENT_MAX,
  ANNOUNCEMENT_TONES,
  HERO_TEXT_MAX,
  isValidQuickUrl,
  QUICK_LINK_TITLE_MAX,
  QUICK_LINKS_MAX,
  type Announcement,
  type QuickLink,
} from "@/lib/acrofeed";
import type { Database } from "@/lib/supabase/database.types";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./posts";

export async function saveHeroText(text: string): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Doar antrenorii pot modifica mesajul AcroMib." };
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

type SettingsUpdate = Database["public"]["Tables"]["app_settings"]["Update"];

async function updateSettings(values: SettingsUpdate, migration: string): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Doar antrenorii pot modifica setările AcroMib." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .update({ ...values, updated_at: new Date().toISOString(), updated_by: me.id })
    .eq("id", true)
    .select("id");
  if (error || !data?.length) {
    console.error("app_settings update", error?.message ?? "no settings row");
    return { ok: false, error: error?.code === "42703" || !error ? `Rulează migrarea ${migration} în Supabase.` : "Setările nu au putut fi salvate." };
  }
  revalidatePath("/feed");
  revalidatePath("/dashboard/acrofeed");
  return { ok: true };
}

export async function saveAnnouncement(input: Announcement): Promise<ActionResult> {
  const text = input.text.trim();
  if (input.enabled && !text) return { ok: false, error: "Scrie textul anunțului înainte să-l activezi." };
  if (text.length > ANNOUNCEMENT_MAX) return { ok: false, error: `Anunțul poate avea maxim ${ANNOUNCEMENT_MAX} de caractere.` };
  if (!ANNOUNCEMENT_TONES.some((t) => t.value === input.tone)) return { ok: false, error: "Stil invalid." };
  return updateSettings({ announcement_enabled: input.enabled, announcement_text: text || null, announcement_tone: input.tone }, "0012_acromib_widgets.sql");
}

export async function saveQuickLinks(input: QuickLink[]): Promise<ActionResult> {
  const links = input.map((l) => ({ title: l.title.trim(), url: l.url.trim() })).filter((l) => l.title || l.url);
  if (links.length > QUICK_LINKS_MAX) return { ok: false, error: `Maxim ${QUICK_LINKS_MAX} linkuri.` };
  for (const l of links) {
    if (!l.title || l.title.length > QUICK_LINK_TITLE_MAX) return { ok: false, error: `Fiecare link are nevoie de un titlu (maxim ${QUICK_LINK_TITLE_MAX} de caractere).` };
    if (l.url.length > 500 || !isValidQuickUrl(l.url)) return { ok: false, error: `Link invalid pentru „${l.title}”. Folosește https://…, /pagina, tel: sau mailto:.` };
  }
  return updateSettings({ quick_links: links }, "0012_acromib_widgets.sql");
}
