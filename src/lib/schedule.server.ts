import "server-only";
import type { ScheduleRow } from "./schedule";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

export async function getSchedule(): Promise<ScheduleRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) console.error("schedule", error.message);
  return data ?? [];
}
