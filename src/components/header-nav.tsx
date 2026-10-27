"use client";

import { CalendarDays, House, Info, LayoutDashboard, LogOut, MessageSquare, Rss, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/logo";
import { RoleBadge } from "@/components/role-badge";
import type { AppRole } from "@/lib/supabase/database.types";

type Item = { href: string; label: string; icon: LucideIcon; badge?: number };

function Badge({ n }: { n: number }) {
  return (
    <span data-testid="unread-badge" className="grid min-w-5 place-items-center rounded-full bg-neon-purple px-1 text-[10px] font-black leading-5 text-black">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function HeaderNav({
  name,
  role,
  dashboard,
  messagesHref,
  unread,
}: {
  name: string;
  role: AppRole;
  dashboard: { href: string; label: string } | null;
  messagesHref: string;
  unread: number;
}) {
  const pathname = usePathname();
  const items: Item[] = [
    { href: "/", label: "Acasă", icon: House },
    { href: "/feed", label: "AcroFeed", icon: Rss },
    { href: "/schedule", label: "Program", icon: CalendarDays },
    ...(dashboard ? [{ ...dashboard, icon: LayoutDashboard }] : []),
    { href: messagesHref, label: "Mesaje", icon: MessageSquare, badge: unread },
    { href: "/despre", label: "Despre Noi", icon: Info },
  ];
  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/70 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-neon-violet/50 to-transparent" />
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Logo href="/" />

          <nav className="ml-2 hidden items-center gap-0.5 lg:flex" aria-label="Navigare principală">
            {items.map(({ href, label, icon: Icon, badge }) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={`relative inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition ${
                  active(href) ? "bg-neon-violet/15 text-neon-violet shadow-neon-sm ring-1 ring-neon-violet/60" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="size-4" />
                {label}
                {!!badge && <Badge n={badge} />}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3" data-testid="header-user">
              <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-neon-violet to-neon-purple text-sm font-black text-black">
                {name[0]?.toUpperCase()}
              </span>
              <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                <span className="max-w-36 truncate text-sm font-semibold">{name}</span>
                <RoleBadge role={role} className="mt-0.5 w-fit !px-1.5 !py-0 !text-[9px]" />
              </span>
            </div>
            <form action={signOut}>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/70 transition hover:bg-red-500/10 hover:text-red-300">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Deconectare</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Navigare mobilă">
        <ul className="mx-auto flex max-w-md">
          {items.map(({ href, label, icon: Icon, badge }) => (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold ${active(href) ? "text-neon-violet" : "text-white/60"}`}
              >
                {active(href) && <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-neon-violet shadow-[0_0_10px_rgb(168_85_247)]" />}
                <span className="relative">
                  <Icon className="size-5" />
                  {!!badge && (
                    <span className="absolute -right-3 -top-2">
                      <Badge n={badge} />
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
