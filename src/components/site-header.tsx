import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

export const SITE_NAV = [
  { href: "/", label: "Acasă" },
  { href: "/despre", label: "Despre Noi" },
  { href: "/#discipline", label: "Discipline" },
  { href: "/#program", label: "Program" },
  { href: "/#acrofeed", label: "AcroFeed" },
];

/** Public header for visitors who are not logged in (logged-in users get the app header everywhere). */
export function SiteHeader({ current }: { current?: string }) {
  const link = (active: boolean) =>
    `whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${active ? "bg-neon-violet/15 text-neon-violet shadow-neon-sm ring-1 ring-neon-violet/60" : "text-white/70 hover:bg-white/5 hover:text-white"}`;
  return (
    <header className="relative z-20 mx-auto w-full max-w-6xl px-5 py-5">
      <div className="flex items-center justify-between gap-4">
        <Logo href="/" />
        <nav className="hidden items-center gap-1 rounded-2xl border border-white/10 bg-black/30 p-1 backdrop-blur-xl lg:flex" aria-label="Secțiuni">
          {SITE_NAV.map((n) => (
            <a key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined} className={link(current === n.href)}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex gap-2">
          <ButtonLink href="/login" variant="ghost">
            Login
          </ButtonLink>
          <ButtonLink href="/signup" className="hidden sm:inline-flex">
            Creează Cont
          </ButtonLink>
        </div>
      </div>
      <nav className="-mx-5 mt-4 flex gap-1 overflow-x-auto px-5 lg:hidden" aria-label="Secțiuni (mobil)">
        {SITE_NAV.map((n) => (
          <a key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined} className={`${link(current === n.href)} border border-white/10 bg-black/30 backdrop-blur-xl`}>
            {n.label}
          </a>
        ))}
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
