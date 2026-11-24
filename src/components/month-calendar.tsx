"use client";

import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { addDays, isoWeekday } from "@/lib/schedule";

export type CalendarDayInfo = {
  count: number;
  status?: "attending" | "absent";
  badge?: number;
};

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const monthTitle = (month: string) =>
  new Intl.DateTimeFormat("ro-RO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));

export function shiftMonth(month: string, delta: number) {
  const d = new Date(`${month}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 7);
}

/** Monday-first calendar, collapsed to the selected day's week until „Lună” expands the whole month; each day shows its classes as dots plus the user's answer (or a count badge). */
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
  const [expanded, setExpanded] = useState(false);
  const first = `${month}-01`;
  const weekStart = addDays(selected, 1 - isoWeekday(selected));
  const lead = expanded ? isoWeekday(first) - 1 : 0;
  const days: string[] = [];
  if (expanded)
    for (let d = first; d.startsWith(month); d = addDays(d, 1)) days.push(d);
  else for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));
  const shown = expanded ? month : selected.slice(0, 7);
  const step = (delta: number) => {
    if (expanded) return onMonth(shiftMonth(month, delta));
    const next = addDays(selected, delta * 7);
    if (next.slice(0, 7) >= minMonth && next.slice(0, 7) <= maxMonth)
      onSelect(next);
  };
  const canPrev = expanded
    ? month > minMonth
    : addDays(selected, -7).slice(0, 7) >= minMonth;
  const canNext = expanded
    ? month < maxMonth
    : addDays(selected, 7).slice(0, 7) <= maxMonth;

  return (
    <div
      className="glass relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl p-3 sm:p-4"
      data-testid="month-calendar"
    >
      <div className="pointer-events-none absolute -left-16 -top-20 size-40 rounded-full bg-neon-orange/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-10 size-40 rounded-full bg-neon-green/10 blur-3xl" />
      <div className="relative flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={!canPrev}
          aria-label={expanded ? "Luna anterioară" : "Săptămâna anterioară"}
          className="grid size-8 place-items-center rounded-full border border-white/10 text-white/70 transition hover:border-neon-orange/60 hover:text-neon-orange disabled:opacity-25"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-center">
          <h2
            className="font-display text-base font-black first-letter:uppercase sm:text-lg"
            aria-live="polite"
            data-testid="calendar-month"
          >
            {monthTitle(shown)}
          </h2>
          <div className="mt-1 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!expanded) onMonth(selected.slice(0, 7));
                setExpanded(!expanded);
              }}
              aria-expanded={expanded}
              data-testid="calendar-toggle"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/70 transition hover:border-neon-orange/60 hover:text-neon-orange"
            >
              {expanded ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <CalendarDays className="size-3.5" />
              )}
              {expanded ? "Restrânge" : "Lună"}
            </button>
            {(month !== today.slice(0, 7) || selected !== today) && (
              <button
                type="button"
                onClick={() => {
                  onMonth(today.slice(0, 7));
                  onSelect(today);
                }}
                className="text-[11px] font-bold leading-none text-neon-orange hover:underline"
              >
                Azi
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={!canNext}
          aria-label={expanded ? "Luna următoare" : "Săptămâna următoare"}
          className="grid size-8 place-items-center rounded-full border border-white/10 text-white/70 transition hover:border-neon-orange/60 hover:text-neon-orange disabled:opacity-25"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="relative mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-wider text-white/40">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className={i > 4 ? "text-neon-orange/70" : undefined}>
            {d}
          </span>
        ))}
      </div>
      <div
        className="relative mt-1.5 grid grid-cols-7 gap-1"
        role="grid"
        aria-label={monthTitle(shown)}
      >
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
              aria-label={`${Number(date.slice(8))}${
                isToday ? " (azi)" : ""
              }: ${count ? `${count} antrenamente` : "liber"}`}
              onClick={() => {
                onSelect(date);
                setExpanded(false);
              }}
              data-testid="calendar-day"
              data-date={date}
              className={`relative flex h-10 flex-col items-center justify-center rounded-xl border text-[13px] font-extrabold transition active:scale-95 ${
                on
                  ? "border-neon-orange bg-neon-orange text-onaccent shadow-neon-sm"
                  : count
                  ? "border-white/10 bg-white/5 hover:border-neon-orange/60"
                  : "border-transparent text-white/50 hover:border-white/10"
              } ${past && !on ? "opacity-45" : ""} ${
                isToday && !on ? "ring-2 ring-neon-green ring-offset-0" : ""
              }`}
            >
              {Number(date.slice(8))}
              {count > 0 && (
                <span className="flex h-1 gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                    <span
                      key={i}
                      className={`size-1 rounded-full ${
                        on ? "bg-onaccent/70" : "bg-neon-orange"
                      }`}
                    />
                  ))}
                </span>
              )}
              {status && (
                <span
                  className={`absolute -right-0.5 -top-0.5 grid size-3.5 place-items-center rounded-full text-white ${
                    status === "attending" ? "bg-emerald-500" : "bg-red-500"
                  }`}
                  aria-label={status === "attending" ? "confirmat" : "nu vii"}
                >
                  {status === "attending" ? (
                    <Check className="size-2.5" strokeWidth={3} />
                  ) : (
                    <X className="size-2.5" strokeWidth={3} />
                  )}
                </span>
              )}
              {!status && badge ? (
                <span className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-emerald-500 px-0.5 text-[9px] font-black text-white">
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
