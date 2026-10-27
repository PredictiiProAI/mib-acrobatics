"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import { BADGE_COLORS, LEVELS, type BadgeColor, type ScheduleLevel } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./posts";

export type ScheduleInput = {
  id?: string;
  group_name: string;
  age_range: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  level: ScheduleLevel;
  badge_color: BadgeColor;
  notes: string;
  sort_order: number;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function revalidateSchedule() {
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/dashboard/schedule");
}

export async function saveScheduleEntry(input: ScheduleInput): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Doar antrenorii pot modifica programul." };

  const group_name = input.group_name.trim().slice(0, 80);
  const start = input.start_time.slice(0, 5);
  const end = input.end_time.slice(0, 5);
  if (!group_name) return { ok: false, error: "Completează numele grupei." };
  if (!Number.isInteger(input.day_of_week) || input.day_of_week < 1 || input.day_of_week > 7) return { ok: false, error: "Alege ziua." };
  if (!TIME.test(start) || !TIME.test(end)) return { ok: false, error: "Ora trebuie să fie în formatul HH:MM." };
  if (end <= start) return { ok: false, error: "Ora de final trebuie să fie după ora de început." };
  if (!LEVELS.includes(input.level) || !BADGE_COLORS.includes(input.badge_color)) return { ok: false, error: "Nivel sau culoare invalidă." };

  const row = {
    group_name,
    age_range: input.age_range.trim().slice(0, 40) || null,
    day_of_week: input.day_of_week,
    start_time: start,
    end_time: end,
    level: input.level,
    badge_color: input.badge_color,
    notes: input.notes.trim().slice(0, 200) || null,
    sort_order: Number.isFinite(input.sort_order) ? Math.round(input.sort_order) : 0,
  };

  const supabase = await createClient();
  const { error } = input.id ? await supabase.from("schedule").update(row).eq("id", input.id) : await supabase.from("schedule").insert(row);
  if (error) {
    console.error("saveScheduleEntry", error.message);
    return { ok: false, error: "Ora de antrenament nu a putut fi salvată." };
  }
  revalidateSchedule();
  return { ok: true };
}

export async function deleteScheduleEntry(id: string): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || !isStaff(me.role)) return { ok: false, error: "Doar antrenorii pot modifica programul." };
  const supabase = await createClient();
  const { error } = await supabase.from("schedule").delete().eq("id", id);
  if (error) return { ok: false, error: "Ora de antrenament nu a putut fi ștearsă." };
  revalidateSchedule();
  return { ok: true };
}
