import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ChatThread } from "@/components/chat/chat-thread";
import { ThreadShell } from "@/components/chat/thread-shell";
import { requireUser } from "@/lib/auth";
import { ADMIN_THREAD, COACH_THREAD, getPairThread, getStaffGroups, getStaffIds, THREAD_PAGE_SIZE } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Conversație" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MemberThreadPage({ params, searchParams }: PageProps<"/messages/[userId]">) {
  const [{ userId }, { draft }] = await Promise.all([params, searchParams]);
  const me = await requireUser(`/messages/${userId}`);
  const [staffIds, groups] = await Promise.all([getStaffIds(), getStaffGroups()]);
  const initialText = typeof draft === "string" ? draft.slice(0, 500) : "";

  if (userId === ADMIN_THREAD) {
    const admin = groups.admins[0];
    if (!admin) redirect(`/messages/${COACH_THREAD}`);
    const messages = await getPairThread(me.id, groups.adminIds);
    return (
      <ThreadShell backHref="/messages" name="Administrator MIB" subtitle={<span className="text-neon-green">Feedback și întrebări pentru club</span>}>
        <ChatThread
          key={ADMIN_THREAD}
          viewerId={me.id}
          threadUserId={me.id}
          recipientId={admin.id}
          counterpartIds={groups.adminIds}
          initialMessages={messages}
          pageSize={THREAD_PAGE_SIZE}
          peerName="Administrator MIB"
          initialText={initialText}
          emptyHint="Feedback-ul tău este foarte important pentru noi. Scrie-ne!"
        />
      </ThreadShell>
    );
  }

  if (userId === COACH_THREAD) {
    const coach = groups.coaches[0];
    const messages = await getPairThread(me.id, groups.coachIds);
    const coachName = coach?.full_name || "Antrenor";
    return (
      <ThreadShell backHref="/messages" name={coachName} subtitle={<span className="text-neon-green">Antrenor MIB Acrobatics</span>}>
        {coach ? (
          <ChatThread
            key={COACH_THREAD}
            viewerId={me.id}
            threadUserId={me.id}
            recipientId={coach.id}
            counterpartIds={groups.coachIds}
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
  if (staffIds.includes(userId)) redirect(`/messages/${groups.adminIds.includes(userId) ? ADMIN_THREAD : COACH_THREAD}`);
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
