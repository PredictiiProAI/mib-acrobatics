import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";
import { getSchedule } from "@/lib/schedule.server";
import { ScheduleManager } from "./schedule-manager";

export const metadata: Metadata = { title: "Program & Grupe" };

export default async function DashboardSchedulePage() {
  await requireRole(STAFF_ROLES, "/dashboard/schedule");
  const rows = await getSchedule();
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neon-violet">Orar</p>
          <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">Program & Grupe</h1>
          <p className="mt-2 max-w-2xl text-white/60">
            Adaugă, modifică sau șterge orele săptămânale. Orele cu același nume de grupă apar împreună pe pagina principală și în pagina Program din aplicație.
          </p>
        </div>
        <ButtonLink href="/schedule" variant="ghost">
          <ExternalLink className="size-4" /> Vezi ca membru
        </ButtonLink>
      </div>
      <ScheduleManager rows={rows} />
    </div>
  );
}
