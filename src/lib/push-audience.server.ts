import "server-only";
import { createAdminClient } from "./supabase/admin";

type ClassRef = { id: string; group_name: string; city: string | null };

const norm = (s: string | null | undefined) => (s ?? "").trim().toLocaleLowerCase("ro");

/**
 * Who should hear about these classes: members assigned to the class's group (and to its city when the class
 * has one), plus everyone who answered the RSVP for them. With `date`, only that session's RSVPs count and
 * members who said "Nu pot ajunge" are left out (used for the 1-hour reminder).
 */
export async function classAudience(classes: ClassRef[], opts: { fromDate?: string; date?: string } = {}): Promise<string[]> {
  if (!classes.length) return [];
  const admin = createAdminClient();
  if (!admin) return [];

  let rsvpQuery = admin.from("session_attendance").select("user_id, status").in("schedule_id", classes.map((c) => c.id)).in("status", ["attending", "absent"]);
  if (opts.date) rsvpQuery = rsvpQuery.eq("session_date", opts.date);
  else if (opts.fromDate) rsvpQuery = rsvpQuery.gte("session_date", opts.fromDate);
  const [{ data: members, error }, { data: rsvps, error: rsvpError }] = await Promise.all([
    admin.from("users").select("id, city, groups").not("groups", "eq", "{}"),
    rsvpQuery,
  ]);
  if (error) console.error("classAudience users", error.message);
  if (rsvpError) console.error("classAudience rsvps", rsvpError.message);

  const out = new Set<string>();
  for (const u of (members ?? []) as { id: string; city: string | null; groups: string[] | null }[]) {
    const mine = new Set((u.groups ?? []).map(norm));
    if (classes.some((c) => mine.has(norm(c.group_name)) && (!c.city || norm(c.city) === norm(u.city)))) out.add(u.id);
  }
  for (const r of (rsvps ?? []) as { user_id: string; status: string }[]) {
    if (opts.date && r.status === "absent") out.delete(r.user_id);
    else out.add(r.user_id);
  }
  return [...out];
}
