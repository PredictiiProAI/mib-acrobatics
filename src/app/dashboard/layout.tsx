import { Rss } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { requireRole } from "@/lib/auth";
import { PUBLISHER_ROLES, ROLE_LABEL } from "@/lib/roles";
import { navFor } from "./nav";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireRole(PUBLISHER_ROLES, "/dashboard");
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="glass flex flex-col gap-6 border-y-0 border-l-0 p-5 md:sticky md:top-0 md:h-svh md:w-64">
        <Logo href="/dashboard" />
        <div className="rounded-2xl border border-white/5 bg-black/30 p-3">
          <p className="truncate text-sm font-semibold">{user.fullName ?? user.email}</p>
          <p className="text-xs text-neon-green">{ROLE_LABEL[user.role]}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {navFor(user.role).map((item) =>
            item.soon ? (
              <span key={item.label} className="flex items-center justify-between whitespace-nowrap rounded-xl px-3 py-2 text-sm text-white/35">
                {item.label}
                <span className="ml-2 rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase">curând</span>
              </span>
            ) : (
              <Link key={item.label} href={item.href} className="whitespace-nowrap rounded-xl bg-neon-orange/10 px-3 py-2 text-sm font-semibold text-neon-orange">
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="mt-auto flex items-center justify-between">
          <Link href="/feed" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
            <Rss className="size-4" /> AcroFeed
          </Link>
          <SignOutButton compact />
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
