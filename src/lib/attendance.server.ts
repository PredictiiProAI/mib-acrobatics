import "server-only";
import { nextSessionDate, type AttendancePerson, type AttendanceStatus, type ScheduleRow, type SessionRoster } from "./schedule";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

const key = (scheduleId: string, date: string) => `${scheduleId}:${date}`;

/** The signed-in member's answers for the next occurrence of each class, keyed by schedule id. */
export async function getMyAttendance(userId: string, rows: ScheduleRow[]): Promise<Record<string, AttendanceStatus>> {
  if (!isSupabaseConfigured || rows.length === 0) return {};
  const next = new Map(rows.map((r) => [r.id, nextSessionDate(r)]));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_attendance")
    .select("schedule_id, session_date, status")
    .eq("user_id", userId)
    .in("schedule_id", [...next.keys()])
    .in("session_date", [...new Set(next.values())]);
  if (error) console.error("getMyAttendance", error.message);
  const out: Record<string, AttendanceStatus> = {};
  for (const a of data ?? []) if (next.get(a.schedule_id) === a.session_date) out[a.schedule_id] = a.status;
  return out;
}

/** Staff view: everyone who answered for the next occurrence of each class (RLS lets only staff read others). */
export async function getAttendanceRosters(rows: ScheduleRow[]): Promise<Record<string, SessionRoster>> {
  const rosters: Record<string, SessionRoster> = Object.fromEntries(rows.map((r) => [r.id, { scheduleId: r.id, date: nextSessionDate(r), people: [] }]));
  if (!isSupabaseConfigured || rows.length === 0) return rosters;
  const wanted = new Set(rows.map((r) => key(r.id, rosters[r.id].date)));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_attendance")
    .select("schedule_id, session_date, status, updated_at, user:users!session_attendance_user_id_fkey(id, full_name, display_name, avatar_url)")
    .in("schedule_id", rows.map((r) => r.id))
    .in("session_date", [...new Set(Object.values(rosters).map((r) => r.date))])
    .order("updated_at", { ascending: true });
  if (error) console.error("getAttendanceRosters", error.message);
  for (const a of data ?? []) {
    if (!wanted.has(key(a.schedule_id, a.session_date)) || !a.user) continue;
    const person: AttendancePerson = {
      userId: a.user.id,
      name: a.user.display_name || a.user.full_name || "Membru",
      avatarUrl: a.user.avatar_url,
      status: a.status,
      updatedAt: a.updated_at,
    };
    rosters[a.schedule_id].people.push(person);
  }
  return rosters;
}
