import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatThread } from "@/components/chat/chat-thread";
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
    <section className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl">
      <header className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <Link href="/dashboard/messages" className="rounded-xl p-1.5 text-white/60 hover:bg-white/5 hover:text-white md:hidden" aria-label="Înapoi">
          <ArrowLeft className="size-5" />
        </Link>
        <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-neon-violet to-neon-purple font-black text-black">
          {name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-xs text-white/50">
            <span className="text-neon-purple">{ROLE_LABEL[member.role]}</span> · {member.email}
          </p>
        </div>
      </header>
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
    </section>
  );
}
