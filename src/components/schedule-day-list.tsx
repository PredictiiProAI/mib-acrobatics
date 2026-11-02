"use client";

import { Signal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BADGE_STYLE, DAYS, hhmm, LEVEL_LABEL, type ScheduleRow } from "@/lib/schedule";

const SHORT = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];

/** Mobile-first schedule: scrollable day chips, then the selected day's classes as cards. */
export function ScheduleDayList({ rows, today }: { rows: ScheduleRow[]; today: number }) {
  const [day, setDay] = useState(today);
  const activeChip = useRef<HTMLButtonElement>(null);
  const classes = rows.filter((r) => r.day_of_week === day);

  useEffect(() => {
    activeChip.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [day]);

  return (
    <section aria-label="Program pe zile">
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Zilele săptămânii">
        {DAYS.map((label, i) => {
          const d = i + 1;
          const on = d === day;
          const count = rows.filter((r) => r.day_of_week === d).length;
          return (
            <button
              key={label}
              ref={on ? activeChip : undefined}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={`${label}${d === today ? " (azi)" : ""}: ${count} antrenamente`}
              onClick={() => setDay(d)}
              data-testid="day-chip"
              className={`relative flex min-h-14 min-w-16 shrink-0 snap-center flex-col items-center justify-center rounded-2xl border px-3 py-2 transition active:scale-95 ${
                on ? "border-neon-orange bg-neon-orange text-onaccent shadow-neon-sm" : "border-white/10 bg-carbon/80 text-white/80 hover:border-neon-orange/50"
              }`}
            >
              <span className="text-sm font-extrabold">{SHORT[i]}</span>
              <span className={`text-[11px] font-semibold ${on ? "text-onaccent/70" : "text-white/45"}`}>{count ? `${count} ore` : "liber"}</span>
              {d === today && <span className={`absolute right-1.5 top-1.5 size-1.5 rounded-full ${on ? "bg-onaccent" : "bg-neon-green"}`} />}
            </button>
          );
        })}
      </div>

      <h2 className="mt-6 font-display text-lg font-extrabold" aria-live="polite">
        {DAYS[day - 1]}
        {day === today && <span className="ml-2 rounded-full bg-neon-green/15 px-2 py-0.5 align-middle text-[10px] font-black uppercase text-neon-green">azi</span>}
      </h2>

      {classes.length ? (
        <ul className="mt-3 grid gap-3 md:grid-cols-2" role="tabpanel">
          {classes.map((r) => (
            <li key={r.id} className="glass flex items-stretch gap-4 rounded-2xl p-4" data-testid="day-class">
              <div className="flex w-16 shrink-0 flex-col justify-center border-r border-white/10 pr-4 text-center">
                <span className="font-display text-lg font-black leading-none text-neon-orange">{hhmm(r.start_time)}</span>
                <span className="mt-1 text-xs text-white/50">{hhmm(r.end_time)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="flex min-w-0 items-center gap-2 font-bold">
                    <span className={`size-2.5 shrink-0 rounded-full ${BADGE_STYLE[r.badge_color].dot}`} />
                    <span className="truncate">{r.group_name}</span>
                  </h3>
                  {r.age_range && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${BADGE_STYLE[r.badge_color].badge}`}>{r.age_range}</span>}
                </div>
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-white/55">
                  <Signal className="size-3.5" /> {LEVEL_LABEL[r.level]}
                </p>
                {r.notes && <p className="mt-1 text-xs text-white/45">{r.notes}</p>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="glass mt-3 rounded-2xl p-6 text-center text-sm text-white/50">Nu sunt antrenamente programate {DAYS[day - 1].toLowerCase()}.</p>
      )}
    </section>
  );
}
