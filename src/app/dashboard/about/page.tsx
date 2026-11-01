import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { getAboutContent } from "@/lib/about.server";
import { requireRole } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";
import { GalleryManager, TeamManager } from "./about-manager";

export const metadata: Metadata = { title: "Editare Despre Noi" };

export default async function DashboardAboutPage() {
  await requireRole(STAFF_ROLES, "/dashboard/about");
  const { team, gallery } = await getAboutContent();
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neon-orange">Pagina publică</p>
          <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">Editare Despre Noi</h1>
          <p className="mt-2 max-w-2xl text-white/60">
            Adaugă antrenorii colaboratori și fotografiile sălii. Modificările apar imediat în secțiunile „Echipa Noastră” și „Galerie Foto” de pe pagina Despre Noi.
          </p>
        </div>
        <ButtonLink href="/despre" variant="ghost">
          <ExternalLink className="size-4" /> Vezi pagina
        </ButtonLink>
      </div>
      <TeamManager members={team} />
      <GalleryManager images={gallery} />
    </div>
  );
}
