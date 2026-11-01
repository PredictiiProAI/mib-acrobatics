import type { BadgeColor, Database, ScheduleLevel } from "./supabase/database.types";

export type { BadgeColor, ScheduleLevel };
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
  violet: { label: "Violet", badge: "bg-neon-violet/15 text-neon-violet ring-neon-violet/40", dot: "bg-neon-violet" },
  fuchsia: { label: "Violet intens", badge: "bg-neon-violet/30 text-white ring-neon-violet/70", dot: "bg-neon-violet" },
  sky: { label: "Alb", badge: "bg-white/10 text-white ring-white/40", dot: "bg-white" },
  emerald: { label: "Lime", badge: "bg-neon-lime/15 text-neon-lime ring-neon-lime/40", dot: "bg-neon-lime" },
  amber: { label: "Lime intens", badge: "bg-neon-lime/25 text-white ring-neon-lime/70", dot: "bg-neon-lime" },
  rose: { label: "Violet & lime", badge: "bg-neon-violet/15 text-neon-lime ring-neon-lime/40", dot: "bg-neon-lime" },
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
