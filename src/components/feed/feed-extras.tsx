import { ArrowRight, BadgeCheck, ExternalLink, Info, Megaphone, Siren } from "lucide-react";
import type { Announcement, AnnouncementTone, QuickLink } from "@/lib/acrofeed";

const TONE_STYLE: Record<AnnouncementTone, { box: string; icon: typeof Info }> = {
  important: { box: "border-neon-orange/50 bg-neon-orange/10 text-white [&_svg]:text-neon-orange", icon: Megaphone },
  success: { box: "border-neon-green/50 bg-neon-green/10 text-white [&_svg]:text-neon-green", icon: BadgeCheck },
  urgent: { box: "border-neon-orange bg-neon-orange font-semibold text-black shadow-neon [&_svg]:text-black", icon: Siren },
  info: { box: "border-white/15 bg-white/[0.04] text-white/85 [&_svg]:text-white/70", icon: Info },
};

export function AnnouncementBanner({ announcement }: { announcement: Announcement }) {
  const { box, icon: Icon } = TONE_STYLE[announcement.tone];
  return (
    <div role="status" data-testid="feed-announcement" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed animate-[fade-in_.3s_ease-out] ${box}`}>
      <Icon className={`mt-0.5 size-5 shrink-0 ${announcement.tone === "urgent" ? "animate-pulse" : ""}`} />
      <p className="whitespace-pre-line break-words">{announcement.text}</p>
    </div>
  );
}

export function QuickLinks({ links }: { links: QuickLink[] }) {
  return (
    <nav aria-label="Linkuri utile" data-testid="feed-quick-links" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
      {links.map((l, i) => {
        const external = /^https?:/i.test(l.url);
        return (
          <a
            key={i}
            href={l.url}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="group flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 text-center text-xs font-bold text-white/85 transition hover:border-neon-green/60 hover:text-neon-green hover:shadow-[0_0_14px_rgb(57_255_20/0.25)] sm:text-sm"
          >
            <span className="truncate">{l.title}</span>
            {external ? <ExternalLink className="size-3.5 shrink-0 opacity-60" /> : <ArrowRight className="size-3.5 shrink-0 opacity-60" />}
          </a>
        );
      })}
    </nav>
  );
}
