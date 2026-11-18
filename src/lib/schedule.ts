import type { AttendanceStatus, BadgeColor, Database, ScheduleLevel } from "./supabase/database.types";

export type { AttendanceStatus, BadgeColor, ScheduleLevel };
export type ScheduleRow = Database["public"]["Tables"]["schedule"]["Row"];

/** ISO weekday order: index 0 = Luni (day_of_week 1). */
export const DAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"] as const;
export const dayLabel = (day: number) => DAYS[day - 1] ?? "—";

export const LEVELS: ScheduleLevel[] = ["all", "beginner", "intermediate", "advanced"];
export const LEVEL_LABEL: Record<ScheduleLevel, string> = {
  all: "Toate nivelurile",
  beginner: "Începători",
  intermediate: "Intermediar",
  advanced: "Avansați",
};

export const BADGE_COLORS: BadgeColor[] = ["violet", "fuchsia", "sky", "emerald", "amber", "rose"];
export const BADGE_STYLE: Record<BadgeColor, { label: string; badge: string; dot: string }> = {
  violet: { label: "Violet", badge: "bg-violet-500/15 text-violet-300 ring-violet-400/40", dot: "bg-violet-400" },
  fuchsia: { label: "Fucsia", badge: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/40", dot: "bg-fuchsia-400" },
  sky: { label: "Albastru", badge: "bg-sky-500/15 text-sky-300 ring-sky-400/40", dot: "bg-sky-400" },
  emerald: { label: "Verde", badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40", dot: "bg-emerald-400" },
  amber: { label: "Chihlimbar", badge: "bg-amber-500/15 text-amber-300 ring-amber-400/40", dot: "bg-amber-400" },
  rose: { label: "Roz", badge: "bg-rose-500/15 text-rose-300 ring-rose-400/40", dot: "bg-rose-400" },
};

/** "17:00:00" -> "17:00" */
export const hhmm = (t: string) => t.slice(0, 5);

export function sortSchedule(rows: ScheduleRow[]) {
  return [...rows].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
}

export type ScheduleGroup = {
  name: string;
  ageRange: string | null;
  level: ScheduleLevel;
  color: BadgeColor;
  sortOrder: number;
  sessions: ScheduleRow[];
};

/** Rows sharing a group name become one group card; groups ordered by sort_order, then name. */
export function groupSchedule(rows: ScheduleRow[]): ScheduleGroup[] {
  const groups = new Map<string, ScheduleGroup>();
  for (const row of sortSchedule(rows)) {
    const key = row.group_name.trim().toLowerCase();
    const g = groups.get(key);
    if (g) {
      g.sessions.push(row);
      g.sortOrder = Math.min(g.sortOrder, row.sort_order);
      g.ageRange ??= row.age_range;
    } else {
      groups.set(key, { name: row.group_name, ageRange: row.age_range, level: row.level, color: row.badge_color, sortOrder: row.sort_order, sessions: [row] });
    }
  }
  return [...groups.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ro"));
}

/** ISO weekday (1 = Luni) in the club's timezone. */
export function todayIsoDay(now = new Date()) {
  const name = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Europe/Bucharest" }).format(now);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(name) + 1;
}

/** Today's date ("YYYY-MM-DD"), ISO weekday and "HH:MM" in the club's timezone. */
export function clubNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, day: todayIsoDay(now), time: `${parts.hour}:${parts.minute}` };
}

const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Date ("YYYY-MM-DD") of the next occurrence of a weekly class that has not ended yet. */
export function nextSessionDate(row: Pick<ScheduleRow, "day_of_week" | "end_time">, now = new Date()) {
  const c = clubNow(now);
  let delta = (row.day_of_week - c.day + 7) % 7;
  if (delta === 0 && hhmm(row.end_time) <= c.time) delta = 7;
  return addDays(c.date, delta);
}

/** "2026-11-19" -> "joi, 19 noiembrie" */
export const sessionDateLabel = (isoDate: string) =>
  new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${isoDate}T12:00:00Z`));

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  attending: "Vin",
  absent: "Nu pot ajunge",
  pending: "Fără răspuns",
};

export type AttendancePerson = { userId: string; name: string; avatarUrl: string | null; status: AttendanceStatus; updatedAt: string };
/** Who answered for the next occurrence of one weekly class. */
export type SessionRoster = { scheduleId: string; date: string; people: AttendancePerson[] };
