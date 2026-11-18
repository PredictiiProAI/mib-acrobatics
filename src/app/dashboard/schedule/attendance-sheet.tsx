"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/avatar";
import { hhmm, sessionDateLabel, type AttendancePerson, type ScheduleRow, type SessionRoster } from "@/lib/schedule";

export const rosterCounts = (roster?: SessionRoster) => ({
  attending: roster?.people.filter((p) => p.status === "attending").length ?? 0,
  absent: roster?.people.filter((p) => p.status === "absent").length ?? 0,
});

/** Staff modal: who confirmed / declined the next occurrence of one class. */
export function AttendanceSheet({ row, roster, onClose }: { row: ScheduleRow; roster: SessionRoster; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const attending = roster.people.filter((p) => p.status === "attending");
  const absent = roster.people.filter((p) => p.status === "absent");
  const pending = roster.people.filter((p) => p.status === "pending");

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={`Prezență ${row.group_name}`} data-testid="attendance-sheet">
      <button type="button" aria-label="Închide" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-[fade-in_.15s_ease-out] bg-black/80 backdrop-blur-sm" />
      <div className="relative max-h-[92svh] w-full max-w-lg animate-[sheet-up_.2s_ease-out] overflow-y-auto rounded-3xl border border-neon-orange/40 bg-carbon/95 p-6 shadow-neon backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-neon-orange">Prezență</p>
            <h2 className="mt-1 truncate font-display text-xl font-extrabold">{row.group_name}</h2>
            <p className="text-sm text-white/60 first-letter:uppercase">
              {sessionDateLabel(roster.date)} · {hhmm(row.start_time)}–{hhmm(row.end_time)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Închide" className="rounded-full p-1.5 text-white/60 hover:bg-white/5 hover:text-white">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat label="Vin" value={attending.length} className="text-neon-green" testId="count-attending" />
          <Stat label="Nu vin" value={absent.length} className="text-red-300" testId="count-absent" />
          <Stat label="Total răspunsuri" value={roster.people.length} className="text-white" testId="count-total" />
        </div>

        <PeopleList title="✔️ Au confirmat" people={attending} empty="Nimeni nu a confirmat încă." testId="list-attending" />
        <PeopleList title="❌ Nu pot ajunge" people={absent} empty="Nimeni nu a anunțat că lipsește." testId="list-absent" />
        {pending.length > 0 && <PeopleList title="În așteptare" people={pending} empty="" testId="list-pending" />}
      </div>
    </div>,
    document.body
  );
}

function Stat({ label, value, className, testId }: { label: string; value: number; className: string; testId: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 px-2 py-3">
      <p className={`font-display text-2xl font-black ${className}`} data-testid={testId}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold text-white/50">{label}</p>
    </div>
  );
}

function PeopleList({ title, people, empty, testId }: { title: string; people: AttendancePerson[]; empty: string; testId: string }) {
  return (
    <section className="mt-5">
      <h3 className="text-sm font-bold">
        {title} <span className="text-white/40">({people.length})</span>
      </h3>
      {people.length ? (
        <ul className="mt-2 space-y-1.5" data-testid={testId}>
          {people.map((p) => (
            <li key={p.userId} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
              <Avatar name={p.name} url={p.avatarUrl} className="size-8" textClassName="text-xs" />
              <span className="truncate text-sm font-semibold">{p.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-white/40">{empty}</p>
      )}
    </section>
  );
}
