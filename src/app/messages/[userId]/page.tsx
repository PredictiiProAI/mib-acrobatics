import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ChatThread } from "@/components/chat/chat-thread";
import { ThreadShell } from "@/components/chat/thread-shell";
import { requireUser } from "@/lib/auth";
import { COACH_THREAD, getCoach, getPairThread, getStaffIds, THREAD_PAGE_SIZE } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Conversație" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MemberThreadPage({ params, searchParams }: PageProps<"/messages/[userId]">) {
  const [{ userId }, { draft }] = await Promise.all([params, searchParams]);
  const me = await requireUser(`/messages/${userId}`);
  const staffIds = await getStaffIds();
  const initialText = typeof draft === "string" ? draft.slice(0, 500) : "";

  if (userId === COACH_THREAD) {
    const [coach, messages] = await Promise.all([getCoach(), getPairThread(me.id, staffIds)]);
    const coachName = coach?.full_name || "Antrenor";
    return (
      <ThreadShell backHref="/messages" name={coachName} subtitle={<span className="text-neon-green">Antrenor MIB Acrobatics</span>}>
        {coach ? (
          <ChatThread
            key={COACH_THREAD}
            viewerId={me.id}
            threadUserId={me.id}
            recipientId={coach.id}
            counterpartIds={staffIds}
            initialMessages={messages}
            pageSize={THREAD_PAGE_SIZE}
            peerName={coachName}
            initialText={initialText}
            emptyHint="Ai o întrebare despre antrenamente? Scrie-i direct antrenorului."
          />
        ) : (
          <p className="flex flex-1 items-center justify-center p-8 text-center text-white/50">Antrenorul nu este încă disponibil pentru mesaje.</p>
        )}
      </ThreadShell>
    );
  }

  if (!UUID.test(userId) || userId === me.id) notFound();
  if (staffIds.includes(userId)) redirect(`/messages/${COACH_THREAD}`);
  const supabase = await createClient();
  const [{ data: peer }, messages] = await Promise.all([
    supabase.from("users").select("id, full_name, display_name, account_type").eq("id", userId).maybeSingle(),
    getPairThread(me.id, [userId]),
  ]);
  if (!peer) notFound();
  const name = peer.full_name || peer.display_name || "Membru";

  return (
    <ThreadShell backHref="/messages" name={name} subtitle={<span className="text-neon-green">{peer.account_type ?? "Membru"} · conversație privată</span>}>
      <ChatThread
        key={peer.id}
        viewerId={me.id}
        threadUserId={peer.id}
        recipientId={peer.id}
        counterpartIds={[peer.id]}
        initialMessages={messages}
        pageSize={THREAD_PAGE_SIZE}
        peerName={name}
        initialText={initialText}
        emptyHint={`Începe conversația cu ${name}. Doar voi doi vedeți mesajele.`}
      />
    </ThreadShell>
  );
}
