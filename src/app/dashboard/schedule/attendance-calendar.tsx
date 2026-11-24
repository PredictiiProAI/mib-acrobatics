"use client";

import { Users } from "lucide-react";
import { useState } from "react";
import { MonthCalendar } from "@/components/month-calendar";
import { addDays, attendanceKey, BADGE_STYLE, hhmm, isoWeekday, RSVP_WINDOW_DAYS, sessionDateLabel, type ScheduleRow, type SessionRoster } from "@/lib/schedule";
import { AttendanceSheet, rosterCounts } from "./attendance-sheet";

/** Staff: pick any date in the calendar and open who confirmed / declined each class that day. */
export function AttendanceCalendar({
  rows,
  rosters,
  today,
  initial,
  minMonth,
}: {
  rows: ScheduleRow[];
  rosters: Record<string, SessionRoster>;
  today: string;
  initial: string;
  minMonth: string;
}) {
  const [selected, setSelected] = useState(initial);
  const [month, setMonth] = useState(initial.slice(0, 7));
  const [open, setOpen] = useState<ScheduleRow | null>(null);
  const classesOn = (date: string) => rows.filter((r) => r.day_of_week === isoWeekday(date));
  const roster = (r: ScheduleRow, date: string): SessionRoster => rosters[attendanceKey(r.id, date)] ?? { scheduleId: r.id, date, people: [] };
  const classes = classesOn(selected);

  return (
    <section>
      <h2 className="font-display text-lg font-extrabold">Calendar prezență</h2>
      <p className="mt-1 text-sm text-white/50">Alege o zi, apoi apasă pe un antrenament ca să vezi cine a confirmat și cine nu poate ajunge. Cifra verde arată câți au confirmat.</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start">
        <MonthCalendar
          month={month}
          onMonth={setMonth}
          minMonth={minMonth}
          maxMonth={addDays(today, RSVP_WINDOW_DAYS).slice(0, 7)}
          today={today}
          selected={selected}
          onSelect={(d) => {
            setSelected(d);
            setMonth(d.slice(0, 7));
          }}
          info={(date) => {
            const day = classesOn(date);
            return { count: day.length, badge: day.reduce((n, r) => n + rosterCounts(roster(r, date)).attending, 0) };
          }}
        />
        <div>
          <h3 className="font-display text-lg font-extrabold first-letter:uppercase" data-testid="selected-day">
            {sessionDateLabel(selected)}
            {selected === today && <span className="ml-2 rounded-full bg-neon-green/15 px-2 py-0.5 align-middle text-[10px] font-black uppercase text-neon-green">azi</span>}
          </h3>
          {classes.length ? (
            <ul className="mt-3 grid gap-3 xl:grid-cols-2" data-testid="upcoming-sessions">
              {classes.map((r) => {
                const c = rosterCounts(roster(r, selected));
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(r)}
                      data-testid="upcoming-session"
                      className="glass flex w-full flex-col rounded-2xl p-4 text-left transition hover:border-neon-orange/50 hover:shadow-neon-sm"
                    >
                      <span className="text-xs font-semibold text-white/50">
                        {hhmm(r.start_time)}–{hhmm(r.end_time)}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5">
                        <span className={`size-2 shrink-0 rounded-full ${BADGE_STYLE[r.badge_color].dot}`} />
                        <span className="truncate font-semibold">{r.group_name}</span>
                      </span>
                      <span className="mt-2 flex items-center gap-3 text-xs font-bold">
                        <span className="text-neon-green">✔️ {c.attending}</span>
                        <span className="text-red-300">❌ {c.absent}</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-white/50">
                          <Users className="size-3.5" /> {c.attending + c.absent}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="glass mt-3 rounded-2xl p-6 text-center text-sm text-white/50">Nu sunt antrenamente în această zi.</p>
          )}
        </div>
      </div>
      {open && <AttendanceSheet row={open} roster={roster(open, selected)} onClose={() => setOpen(null)} />}
    </section>
  );
}
