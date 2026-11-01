import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { getFeedSettings } from "@/lib/acrofeed.server";
import { requireRole } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";
import { AnnouncementEditor, QuickLinksEditor } from "./extras-editor";
import { HeroTextEditor } from "./hero-text-editor";

export const metadata: Metadata = { title: "Setări AcroMib" };

export default async function AcroMibSettingsPage() {
  await requireRole(STAFF_ROLES, "/dashboard/acrofeed");
  const settings = await getFeedSettings();
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neon-green">Mesajul zilei</p>
          <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">Setări AcroMib</h1>
          <p className="mt-2 max-w-2xl text-white/60">Mesajul zilei, anunțul important și linkurile utile din bannerul AcroMib, pentru toți membrii.</p>
        </div>
        <ButtonLink href="/feed" variant="ghost">
          <ExternalLink className="size-4" /> Vezi AcroMib
        </ButtonLink>
      </div>
      <HeroTextEditor initialText={settings.heroText} />
      <div className="grid gap-6 xl:grid-cols-2">
        <AnnouncementEditor initial={settings.announcement} />
        <QuickLinksEditor initial={settings.links} />
      </div>
    </div>
  );
}
