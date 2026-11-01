import { CalendarDays, Clock } from "lucide-react";
import type { ReactNode } from "react";
import { BADGE_STYLE, dayLabel, hhmm, LEVEL_LABEL, type ScheduleGroup } from "@/lib/schedule";

/** Weekly schedule as one card per group (landing page and in-app /schedule). */
export function ScheduleGrid({ groups, today, className = "", children }: { groups: ScheduleGroup[]; today?: number; className?: string; children?: ReactNode }) {
  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${className}`} data-testid="schedule-grid">
      {groups.length === 0 && (
        <div className="glass flex items-center justify-center rounded-2xl p-8 text-center text-sm text-white/50">Programul va fi publicat în curând.</div>
      )}
      {groups.map((g) => (
        <div key={g.name} className="glass rounded-2xl p-6 transition hover:-translate-y-1 hover:border-neon-violet/50 hover:shadow-neon" data-testid="schedule-group">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-extrabold">{g.name}</h3>
              <p className="mt-0.5 text-xs text-white/50">{LEVEL_LABEL[g.level]}</p>
            </div>
            {g.ageRange && <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${BADGE_STYLE[g.color].badge}`}>{g.ageRange}</span>}
          </div>
          <ul className="mt-4 divide-y divide-white/5">
            {g.sessions.map((s) => {
              const isToday = today === s.day_of_week;
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className={`inline-flex items-center gap-2 font-semibold ${isToday ? "text-neon-violet" : "text-white/85"}`}>
                    <CalendarDays className="size-4 text-white/40" /> {dayLabel(s.day_of_week)}
                    {isToday && <span className="rounded-full bg-neon-violet px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-neon-sm">azi</span>}
                  </span>
                  <span className="text-right text-white/60">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5" /> {hhmm(s.start_time)} – {hhmm(s.end_time)}
                    </span>
                    {s.notes && <span className="block text-[11px] text-white/40">{s.notes}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {children}
    </div>
  );
}
