import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { getHeroText } from "@/lib/acrofeed.server";
import { requireRole } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";
import { HeroTextEditor } from "./hero-text-editor";

export const metadata: Metadata = { title: "Setări AcroFeed" };

export default async function AcroFeedSettingsPage() {
  await requireRole(STAFF_ROLES, "/dashboard/acrofeed");
  const text = await getHeroText();
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neon-green">Mesajul zilei</p>
          <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">Setări AcroFeed</h1>
          <p className="mt-2 max-w-2xl text-white/60">Textul apare în bannerul din AcroFeed, sub „Salut, [Nume]!”, pentru toți membrii.</p>
        </div>
        <ButtonLink href="/feed" variant="ghost">
          <ExternalLink className="size-4" /> Vezi AcroFeed
        </ButtonLink>
      </div>
      <HeroTextEditor initialText={text} />
    </div>
  );
}
