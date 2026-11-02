import { CalendarDays, House, Info, Rss, UserRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui";

export const SITE_NAV = [
  { href: "/", label: "Acasă" },
  { href: "/despre", label: "Despre Noi" },
  { href: "/#discipline", label: "Discipline" },
  { href: "/#program", label: "Program" },
  { href: "/#acrofeed", label: "AcroMib" },
];

const VISITOR_TABS = [
  { href: "/", label: "Acasă", icon: House },
  { href: "/#acrofeed", label: "AcroMib", icon: Rss },
  { href: "/#program", label: "Program", icon: CalendarDays },
  { href: "/despre", label: "Despre", icon: Info },
  { href: "/login", label: "Cont", icon: UserRound },
];

/** Public header for visitors who are not logged in (logged-in users get the app header everywhere). */
export function SiteHeader({ current }: { current?: string }) {
  const link = (active: boolean) =>
    `whitespace-nowrap rounded-xl px-3 py-2 text-sm lg:px-4 font-semibold transition ${active ? "bg-neon-orange/15 text-neon-orange shadow-neon-sm ring-1 ring-neon-orange/60" : "text-white/70 hover:bg-white/5 hover:text-white"}`;
  return (
    <header className="relative z-20 mx-auto w-full max-w-6xl px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-4">
        <Logo href="/" />
        <nav className="hidden items-center gap-1 rounded-2xl border border-white/10 bg-black/30 p-1 backdrop-blur-md md:flex" aria-label="Secțiuni">
          {SITE_NAV.map((n) => (
            <a key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined} className={link(current === n.href)}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <ButtonLink href="/login" variant="ghost">
            Login
          </ButtonLink>
          <ButtonLink href="/signup" className="hidden sm:inline-flex">
            Creează Cont
          </ButtonLink>
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink/70 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden" aria-label="Navigare mobilă" data-testid="bottom-nav">
        <ul className="mx-auto flex max-w-md">
          {VISITOR_TABS.map(({ href, label, icon: Icon }) => (
            <li key={href} className="flex-1">
              <a
                href={href}
                aria-current={current === href ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-transform active:scale-95 ${current === href ? "text-neon-orange" : "text-white/60"}`}
              >
                {current === href && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-neon-orange shadow-[0_0_10px_rgb(255_106_0)]" />}
                <Icon className="size-5" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-white/40 sm:flex-row">
        <Logo />
        <nav className="flex flex-wrap justify-center gap-4">
          {SITE_NAV.map((n) => (
            <a key={n.href} href={n.href} className="hover:text-white">
              {n.label}
            </a>
          ))}
        </nav>
        <p>© {new Date().getFullYear()} MIB Acrobatics</p>
      </div>
    </footer>
  );
}
