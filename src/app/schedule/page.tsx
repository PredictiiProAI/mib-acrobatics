import type { Metadata } from "next";
import { CalendarDays, Clock, MessageSquare, Pencil } from "lucide-react";
import { ScheduleGrid } from "@/components/schedule-grid";
import { ButtonLink } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import { BADGE_STYLE, dayLabel, groupSchedule, hhmm, sortSchedule, todayIsoDay } from "@/lib/schedule";
import { getSchedule } from "@/lib/schedule.server";

export const metadata: Metadata = { title: "Program" };

export default async function SchedulePage() {
  const user = await requireUser("/schedule");
  const rows = await getSchedule();
  const today = todayIsoDay();
  const todays = sortSchedule(rows).filter((r) => r.day_of_week === today);
  const staff = isStaff(user.role);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neon-violet/20 via-carbon to-neon-purple/10 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-neon-violet/25 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-violet">Antrenamente</p>
            <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">
              Program <span className="text-gradient">săptămânal</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/60">Grupe pe vârste și niveluri. Pentru schimbări sau o oră de probă, scrie-i antrenorului.</p>
          </div>
          {staff ? (
            <ButtonLink href="/dashboard/schedule">
              <Pencil className="size-4" /> Editează programul
            </ButtonLink>
          ) : (
            <ButtonLink href="/messages" variant="ghost">
              <MessageSquare className="size-4" /> Scrie antrenorului
            </ButtonLink>
          )}
        </div>
      </section>

      <section className="glass rounded-3xl p-6" data-testid="today">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-extrabold">
          <CalendarDays className="size-5 text-neon-violet" /> Azi, {dayLabel(today)}
        </h2>
        {todays.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todays.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                <span className={`size-2.5 shrink-0 rounded-full ${BADGE_STYLE[r.badge_color].dot}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.group_name}</span>
                  {r.age_range && <span className="text-xs text-white/50">{r.age_range}</span>}
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
                  <Clock className="size-3.5" /> {hhmm(r.start_time)} – {hhmm(r.end_time)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-white/50">Nu sunt antrenamente programate azi.</p>
        )}
      </section>

      <ScheduleGrid groups={groupSchedule(rows)} today={today} />
    </div>
  );
}
