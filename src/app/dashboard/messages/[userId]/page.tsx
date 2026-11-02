import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatThread } from "@/components/chat/chat-thread";
import { ThreadShell } from "@/components/chat/thread-shell";
import { requireRole } from "@/lib/auth";
import { getThread, THREAD_PAGE_SIZE } from "@/lib/messages";
import { isStaff, ROLE_LABEL, STAFF_ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Conversație" };

export default async function ThreadPage({ params }: PageProps<"/dashboard/messages/[userId]">) {
  const { userId } = await params;
  const me = await requireRole(STAFF_ROLES, `/dashboard/messages/${userId}`);
  const supabase = await createClient();
  const { data: users } = await supabase.rpc("admin_list_users");
  const member = users?.find((u) => u.id === userId);
  if (!member || isStaff(member.role) || member.id === me.id) notFound();

  const messages = await getThread(member.id);
  const name = member.full_name || member.email;

  return (
    <ThreadShell
      backHref="/dashboard/messages"
      name={name}
      className="max-md:pb-[env(safe-area-inset-bottom)]"
      subtitle={
        <>
          <span className="text-neon-green">{ROLE_LABEL[member.role]}</span> · {member.email}
        </>
      }
    >
      <ChatThread
        key={member.id}
        viewerId={me.id}
        threadUserId={member.id}
        recipientId={member.id}
        initialMessages={messages}
        pageSize={THREAD_PAGE_SIZE}
        peerName={member.full_name || "acest membru"}
        emptyHint="Nu există mesaje încă. Trimite primul mesaj."
      />
    </ThreadShell>
  );
}
