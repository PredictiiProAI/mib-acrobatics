"use client";

import { ArrowLeft, House, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import type { AppRole } from "@/lib/supabase/database.types";
import { navFor } from "./nav";

const tap = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl font-bold transition active:scale-95";

/** Sticky Admin header: "Ieși din Admin" on the card grid, "← Înapoi" + home inside a section. */
export function AdminHeader({ role, roleLabel }: { role: AppRole; roleLabel: string }) {
  const pathname = usePathname();
  const home = pathname === "/dashboard";
  const inThread = pathname.startsWith("/dashboard/messages/");
  const section = navFor(role)
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl" data-testid="admin-header">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-3 sm:px-5">
        {home ? (
          <>
            <Logo href="/feed" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate font-display text-sm font-extrabold uppercase tracking-wider">Command Center</p>
              <p className="truncate text-xs text-neon-green">{roleLabel}</p>
            </div>
            <Link
              href="/feed"
              data-testid="admin-exit"
              className={`${tap} border border-neon-orange/60 bg-neon-orange/10 px-4 text-sm text-neon-orange hover:bg-neon-orange/20`}
            >
              <LogOut className="size-4" /> <span>Acasă</span>
              <span className="hidden sm:inline">· Ieși din Admin</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              href={inThread ? "/dashboard/messages" : "/dashboard"}
              data-testid="admin-back"
              className={`${tap} shrink-0 bg-neon-orange px-4 text-sm text-black shadow-neon-sm hover:brightness-110`}
            >
              <ArrowLeft className="size-5" /> Înapoi
            </Link>
            <p className="min-w-0 flex-1 truncate px-1 text-center font-display text-base font-extrabold sm:text-lg">{section?.label ?? "Admin"}</p>
            <Link
              href="/feed"
              aria-label="Acasă — AcroMib"
              data-testid="admin-home"
              className={`${tap} size-11 shrink-0 border border-white/10 bg-black/40 text-white/80 hover:border-neon-green/60 hover:text-neon-green`}
            >
              <House className="size-5" />
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
