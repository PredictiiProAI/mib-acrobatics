import type { Metadata } from "next";
import { MessageSquare, Pencil } from "lucide-react";
import { PushToggle } from "@/components/push-toggle";
import { ScheduleDayList } from "@/components/schedule-day-list";
import { ButtonLink } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import { getMyAttendanceRange } from "@/lib/attendance.server";
import { calendarRange, clubNow, firstSessionDate, sortSchedule } from "@/lib/schedule";
import { getSchedule } from "@/lib/schedule.server";

export const metadata: Metadata = { title: "Program" };

export default async function SchedulePage() {
  const user = await requireUser("/schedule");
  const rows = await getSchedule();
  const today = clubNow().date;
  const staff = isStaff(user.role);
  const { from, to } = calendarRange(today);
  const mine = await getMyAttendanceRange(user.id, from, to);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neon-orange/20 via-carbon to-neon-green/10 p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-neon-orange/25 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-orange">Antrenamente</p>
            <h1 className="mt-2 font-display text-2xl font-black sm:text-3xl md:text-4xl">
              Calendar <span className="text-gradient">antrenamente</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/60">{staff ? "Alege o zi din calendar și confirmă dacă vii. Vezi cine vine la fiecare ședință în Program & Grupe." : "Alege o zi din calendar și confirmă dacă vii, ca antrenorul să știe pe cine așteaptă."}</p>
          </div>
          {staff ? (
            <ButtonLink href="/dashboard/schedule">
              <Pencil className="size-4" /> Editează programul
            </ButtonLink>
          ) : (
            <ButtonLink href="/messages/antrenor" variant="ghost">
              <MessageSquare className="size-4" /> Scrie antrenorului
            </ButtonLink>
          )}
        </div>
      </section>

      <PushToggle promptOnly />

      <ScheduleDayList rows={sortSchedule(rows)} today={today} initial={firstSessionDate(rows)} mine={mine} />
    </div>
  );
}
