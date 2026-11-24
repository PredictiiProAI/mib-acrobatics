"use client";

import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { addDays, isoWeekday } from "@/lib/schedule";

export type CalendarDayInfo = { count: number; status?: "attending" | "absent"; badge?: number };

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const monthTitle = (month: string) =>
  new Intl.DateTimeFormat("ro-RO", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));

export function shiftMonth(month: string, delta: number) {
  const d = new Date(`${month}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}

/** Monday-first month grid; each day shows its classes as dots plus the user's answer (or a count badge). */
export function MonthCalendar({
  month,
  onMonth,
  minMonth,
  maxMonth,
  today,
  selected,
  onSelect,
  info,
}: {
  month: string;
  onMonth: (month: string) => void;
  minMonth: string;
  maxMonth: string;
  today: string;
  selected: string;
  onSelect: (date: string) => void;
  info: (date: string) => CalendarDayInfo;
}) {
  const first = `${month}-01`;
  const lead = isoWeekday(first) - 1;
  const days: string[] = [];
  for (let d = first; d.startsWith(month); d = addDays(d, 1)) days.push(d);

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-4 sm:p-6" data-testid="month-calendar">
      <div className="pointer-events-none absolute -left-16 -top-20 size-56 rounded-full bg-neon-orange/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-10 size-56 rounded-full bg-neon-green/10 blur-3xl" />
      <div className="relative flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onMonth(shiftMonth(month, -1))}
          disabled={month <= minMonth}
          aria-label="Luna anterioară"
          className="grid size-10 place-items-center rounded-full border border-white/10 text-white/70 transition hover:border-neon-orange/60 hover:text-neon-orange disabled:opacity-25"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <h2 className="font-display text-xl font-black first-letter:uppercase sm:text-2xl" aria-live="polite" data-testid="calendar-month">
            {monthTitle(month)}
          </h2>
          {(month !== today.slice(0, 7) || selected !== today) && (
            <button
              type="button"
              onClick={() => {
                onMonth(today.slice(0, 7));
                onSelect(today);
              }}
              className="mt-0.5 text-xs font-bold text-neon-orange hover:underline"
            >
              Azi
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onMonth(shiftMonth(month, 1))}
          disabled={month >= maxMonth}
          aria-label="Luna următoare"
          className="grid size-10 place-items-center rounded-full border border-white/10 text-white/70 transition hover:border-neon-orange/60 hover:text-neon-orange disabled:opacity-25"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="relative mt-5 grid grid-cols-7 gap-1 text-center text-[11px] font-black uppercase tracking-wider text-white/40 sm:gap-2">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className={i > 4 ? "text-neon-orange/70" : undefined}>
            {d}
          </span>
        ))}
      </div>
      <div className="relative mt-2 grid grid-cols-7 gap-1 sm:gap-2" role="grid" aria-label={monthTitle(month)}>
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {days.map((date) => {
          const { count, status, badge } = info(date);
          const on = date === selected;
          const isToday = date === today;
          const past = date < today;
          return (
            <button
              key={date}
              type="button"
              role="gridcell"
              aria-selected={on}
              aria-label={`${Number(date.slice(8))}${isToday ? " (azi)" : ""}: ${count ? `${count} antrenamente` : "liber"}`}
              onClick={() => onSelect(date)}
              data-testid="calendar-day"
              data-date={date}
              className={`relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-2xl border text-sm font-extrabold transition active:scale-95 sm:text-base ${
                on
                  ? "border-neon-orange bg-neon-orange text-onaccent shadow-neon-sm"
                  : count
                    ? "border-white/10 bg-white/5 hover:border-neon-orange/60"
                    : "border-transparent text-white/50 hover:border-white/10"
              } ${past && !on ? "opacity-45" : ""} ${isToday && !on ? "ring-2 ring-neon-green ring-offset-0" : ""}`}
            >
              {Number(date.slice(8))}
              {count > 0 && (
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                    <span key={i} className={`size-1.5 rounded-full ${on ? "bg-onaccent/70" : "bg-neon-orange"}`} />
                  ))}
                </span>
              )}
              {status && (
                <span
                  className={`absolute -right-1 -top-1 grid size-4 place-items-center rounded-full text-white ${status === "attending" ? "bg-emerald-500" : "bg-red-500"}`}
                  aria-label={status === "attending" ? "confirmat" : "nu vii"}
                >
                  {status === "attending" ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
                </span>
              )}
              {!status && badge ? (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-white">{badge}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
