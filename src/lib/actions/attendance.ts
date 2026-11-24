"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { canAnswer, nextSessionDate } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./posts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Records the member's answer for one occurrence of a weekly class (the next one when no date is given). */
export async function setAttendance(scheduleId: string, status: "attending" | "absent", date?: string): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "Intră în cont ca să confirmi prezența." };
  if (typeof scheduleId !== "string" || !UUID.test(scheduleId) || (status !== "attending" && status !== "absent")) return { ok: false, error: "Cerere invalidă." };

  const supabase = await createClient();
  const { data: row } = await supabase.from("schedule").select("day_of_week, end_time").eq("id", scheduleId).maybeSingle();
  if (!row) return { ok: false, error: "Antrenamentul nu mai există în program." };
  if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !canAnswer(row, date)))
    return { ok: false, error: "Poți răspunde doar pentru antrenamentele din următoarele 8 săptămâni." };
  const session_date = date ?? nextSessionDate(row);

  const { data: existing } = await supabase
    .from("session_attendance")
    .select("id")
    .eq("schedule_id", scheduleId)
    .eq("session_date", session_date)
    .eq("user_id", me.id)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from("session_attendance").update({ status }).eq("id", existing.id)
    : await supabase.from("session_attendance").insert({ schedule_id: scheduleId, session_date, user_id: me.id, status });
  if (error) {
    console.error("setAttendance", error.message);
    return { ok: false, error: "Răspunsul nu a putut fi salvat. Încearcă din nou." };
  }
  revalidatePath("/schedule");
  revalidatePath("/dashboard/schedule");
  return { ok: true };
}
