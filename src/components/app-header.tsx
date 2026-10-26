import { LayoutDashboard, MessageSquare, Rss } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import type { SessionUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/messages";
import { canPublish, isStaff } from "@/lib/roles";

const iconLink = "relative rounded-xl p-2 text-white/70 transition hover:bg-white/5 hover:text-white";

/** Top bar for member-facing pages (AcroFeed, Messenger). */
export async function AppHeader({ user }: { user: SessionUser }) {
  const unread = await getUnreadCount(user.id);
  return (
    <header className="glass sticky top-0 z-30 border-x-0 border-t-0">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Logo href="/feed" />
        <nav className="flex items-center gap-1">
          <Link href="/feed" className={iconLink} title="AcroFeed" aria-label="AcroFeed">
            <Rss className="size-5" />
          </Link>
          {canPublish(user.role) && (
            <Link href="/dashboard" className={iconLink} title="Dashboard" aria-label="Dashboard">
              <LayoutDashboard className="size-5" />
            </Link>
          )}
          <Link href={isStaff(user.role) ? "/dashboard/messages" : "/messages"} className={iconLink} title="Mesaje" aria-label="Mesaje">
            <MessageSquare className="size-5" />
            {unread > 0 && (
              <span data-testid="unread-badge" className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-neon-green px-1 text-[10px] font-black text-black">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
          <SignOutButton compact />
        </nav>
      </div>
    </header>
  );
}
