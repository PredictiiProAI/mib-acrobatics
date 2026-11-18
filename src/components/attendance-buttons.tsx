"use client";

import { Loader2 } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { setAttendance } from "@/lib/actions/attendance";
import { sessionDateLabel, type AttendanceStatus } from "@/lib/schedule";

/** Member RSVP for the next occurrence of a class: two large tap targets plus the current answer. */
export function AttendanceButtons({ scheduleId, date, status }: { scheduleId: string; date: string; status: AttendanceStatus | null }) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const answer = (next: "attending" | "absent") =>
    startTransition(async () => {
      setError(null);
      setOptimistic(next);
      const res = await setAttendance(scheduleId, next);
      if (!res.ok) setError(res.error);
    });

  const base = "inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-2 text-[13px] font-bold transition active:scale-95 disabled:opacity-60";
  return (
    <div className="mt-3 border-t border-white/10 pt-3" data-testid="attendance">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-white/50 first-letter:uppercase">{sessionDateLabel(date)}</span>
        {optimistic === "attending" ? (
          <span className="rounded-full bg-neon-green/15 px-2.5 py-1 font-black text-neon-green" data-testid="attendance-status">
            ✔️ Prezență confirmată
          </span>
        ) : optimistic === "absent" ? (
          <span className="rounded-full bg-red-500/15 px-2.5 py-1 font-black text-red-300" data-testid="attendance-status">
            ❌ Nu vii
          </span>
        ) : (
          <span className="text-white/40" data-testid="attendance-status">
            Nu ai răspuns încă
          </span>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={pending}
          aria-pressed={optimistic === "attending"}
          onClick={() => answer("attending")}
          data-testid="rsvp-yes"
          className={`${base} ${optimistic === "attending" ? "border-neon-green bg-neon-green text-onaccent" : "border-neon-green/40 text-neon-green hover:bg-neon-green/10"}`}
        >
          {pending && optimistic === "attending" ? <Loader2 className="size-4 animate-spin" /> : <span aria-hidden>✔️</span>} Confirm prezența
        </button>
        <button
          type="button"
          disabled={pending}
          aria-pressed={optimistic === "absent"}
          onClick={() => answer("absent")}
          data-testid="rsvp-no"
          className={`${base} ${optimistic === "absent" ? "border-red-400 bg-red-500/80 text-white" : "border-red-400/40 text-red-300 hover:bg-red-500/10"}`}
        >
          {pending && optimistic === "absent" ? <Loader2 className="size-4 animate-spin" /> : <span aria-hidden>❌</span>} Nu pot ajunge
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}
