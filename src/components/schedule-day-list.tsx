"use client";

import { Signal } from "lucide-react";
import { useState } from "react";
import { AttendanceButtons } from "@/components/attendance-buttons";
import { MonthCalendar } from "@/components/month-calendar";
import {
  addDays,
  attendanceKey,
  BADGE_STYLE,
  canAnswer,
  hhmm,
  isoWeekday,
  LEVEL_LABEL,
  RSVP_WINDOW_DAYS,
  sessionDateLabel,
  type AttendanceStatus,
  type ScheduleRow,
} from "@/lib/schedule";

/** Mobile-first schedule: a month calendar, then the selected date's classes with RSVP for that exact date. */
export function ScheduleDayList({ rows, today, initial, mine }: { rows: ScheduleRow[]; today: string; initial: string; mine: Record<string, AttendanceStatus> }) {
  const [selected, setSelected] = useState(initial);
  const [month, setMonth] = useState(initial.slice(0, 7));
  const classesOn = (date: string) => rows.filter((r) => r.day_of_week === isoWeekday(date));
  const classes = classesOn(selected);
  const past = selected < today;

  return (
    <section aria-label="Calendar antrenamente" className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start">
      <MonthCalendar
        month={month}
        onMonth={setMonth}
        minMonth={today.slice(0, 7)}
        maxMonth={addDays(today, RSVP_WINDOW_DAYS).slice(0, 7)}
        today={today}
        selected={selected}
        onSelect={(d) => {
          setSelected(d);
          setMonth(d.slice(0, 7));
        }}
        info={(date) => {
          const day = classesOn(date);
          const answers = day.map((r) => mine[attendanceKey(r.id, date)]);
          return { count: day.length, status: answers.includes("attending") ? "attending" : answers.includes("absent") ? "absent" : undefined };
        }}
      />

      <div>
        <h2 className="font-display text-lg font-extrabold first-letter:uppercase" aria-live="polite" data-testid="selected-day">
          {sessionDateLabel(selected)}
          {selected === today && <span className="ml-2 rounded-full bg-neon-green/15 px-2 py-0.5 align-middle text-[10px] font-black uppercase text-neon-green">azi</span>}
        </h2>

        {classes.length ? (
          <ul className="mt-3 grid gap-3 xl:grid-cols-2">
            {classes.map((r) => {
              const status = mine[attendanceKey(r.id, selected)] ?? null;
              return (
                <li key={r.id} className="glass rounded-2xl p-4" data-testid="day-class">
                  <div className="flex items-stretch gap-4">
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
                  </div>
                  {canAnswer(r, selected) ? (
                    <AttendanceButtons key={attendanceKey(r.id, selected)} scheduleId={r.id} date={selected} status={status} />
                  ) : (
                    <p className="mt-3 border-t border-white/10 pt-3 text-xs text-white/45" data-testid="attendance-closed">
                      {past || selected === today
                        ? `Antrenament încheiat${status === "attending" ? " · ✔️ ai fost confirmat" : status === "absent" ? " · ❌ ai anunțat că lipsești" : ""}`
                        : "Poți confirma prezența cu cel mult 8 săptămâni înainte."}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="glass mt-3 rounded-2xl p-6 text-center text-sm text-white/50">Nu sunt antrenamente programate în această zi.</p>
        )}
      </div>
    </section>
  );
}
