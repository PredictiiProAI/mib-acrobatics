import { House, Rss } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { requireRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/messages";
import { PUBLISHER_ROLES, ROLE_LABEL, isStaff } from "@/lib/roles";
import { navFor } from "./nav";
import { NavLinks } from "./nav-links";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireRole(PUBLISHER_ROLES, "/dashboard");
  const unread = isStaff(user.role) ? await getUnreadCount(user.id) : 0;
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="glass flex flex-col gap-6 border-y-0 border-l-0 p-5 md:sticky md:top-0 md:h-svh md:w-64">
        <Logo href="/" />
        <div className="rounded-2xl border border-white/5 bg-black/30 p-3">
          <p className="truncate text-sm font-semibold">{user.fullName ?? user.email}</p>
          <p className="text-xs text-neon-purple">{ROLE_LABEL[user.role]}</p>
        </div>
        <NavLinks items={navFor(user.role)} badges={{ "/dashboard/messages": unread }} />
        <div className="mt-auto flex items-center justify-between gap-1">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white">
            <House className="size-4" /> Acasă
          </Link>
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
