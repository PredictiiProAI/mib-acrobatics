import type { SessionUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/messages";
import { canPublish, isStaff } from "@/lib/roles";
import { HeaderNav } from "./header-nav";

/** Top bar (and mobile tab bar) for member-facing pages: AcroFeed, Messenger. */
export async function AppHeader({ user }: { user: SessionUser }) {
  const unread = await getUnreadCount(user.id);
  return (
    <HeaderNav
      name={user.fullName || user.email.split("@")[0]}
      role={user.role}
      dashboard={canPublish(user.role) ? { href: "/dashboard", label: isStaff(user.role) ? "Admin" : "Dashboard" } : null}
      messagesHref={isStaff(user.role) ? "/dashboard/messages" : "/messages"}
      unread={unread}
    />
  );
}
