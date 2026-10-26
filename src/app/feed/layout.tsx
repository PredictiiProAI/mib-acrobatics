import { LayoutDashboard, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { requireUser } from "@/lib/auth";
import { canPublish } from "@/lib/roles";

export default async function FeedLayout({ children }: LayoutProps<"/feed">) {
  const user = await requireUser("/feed");
  return (
    <>
      <header className="glass sticky top-0 z-30 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Logo href="/feed" />
          <nav className="flex items-center gap-1">
            {canPublish(user.role) && (
              <Link href="/dashboard" className="rounded-xl p-2 text-white/70 hover:bg-white/5 hover:text-white" title="Dashboard">
                <LayoutDashboard className="size-5" />
              </Link>
            )}
            <span className="rounded-xl p-2 text-white/30" title="Mesaje — în curând">
              <MessageSquare className="size-5" />
            </span>
            <SignOutButton compact />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
