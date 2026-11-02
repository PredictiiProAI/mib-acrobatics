import { requireRole } from "@/lib/auth";
import { getInbox } from "@/lib/messages";
import { STAFF_ROLES } from "@/lib/roles";
import { InboxList } from "./inbox-list";

export default async function MessagesLayout({ children }: LayoutProps<"/dashboard/messages">) {
  const user = await requireRole(STAFF_ROLES, "/dashboard/messages");
  const conversations = await getInbox(user.id);
  return (
    <div className="flex h-[calc(100svh-4rem-1px-env(safe-area-inset-top))] min-h-[28rem] gap-4 max-md:-mb-10 max-md:-mt-6 md:h-[calc(100svh-9rem)]">
      <InboxList conversations={conversations} />
      {children}
    </div>
  );
}
