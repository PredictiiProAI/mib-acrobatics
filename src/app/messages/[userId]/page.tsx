import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ChatThread } from "@/components/chat/chat-thread";
import { ThreadShell } from "@/components/chat/thread-shell";
import { requireUser } from "@/lib/auth";
import { ADMIN_THREAD, COACH_THREAD, getPairThread, getStaffGroups, THREAD_PAGE_SIZE } from "@/lib/messages";
import { isStaff } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Conversație" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MemberThreadPage({ params, searchParams }: PageProps<"/messages/[userId]">) {
  const [{ userId }, { draft }] = await Promise.all([params, searchParams]);
  const me = await requireUser(`/messages/${userId}`);
  const initialText = typeof draft === "string" ? draft.slice(0, 500) : "";

  // Legacy slugs: "antrenor" opens the first coach, "admin" the first administrator (falling back to a coach).
  if (userId === COACH_THREAD || userId === ADMIN_THREAD) {
    const { coaches, admins } = await getStaffGroups();
    const target = userId === ADMIN_THREAD ? (admins[0] ?? coaches[0]) : coaches[0];
    if (!target) notFound();
    redirect(`/messages/${target.id}${initialText ? `?draft=${encodeURIComponent(initialText)}` : ""}`);
  }

  if (!UUID.test(userId) || userId === me.id) notFound();
  const supabase = await createClient();
  const [{ data: peer }, messages] = await Promise.all([
    supabase.from("users").select("id, full_name, display_name, account_type, role, shown_as_coach").eq("id", userId).maybeSingle(),
    getPairThread(me.id, [userId]),
  ]);
  if (!peer) notFound();
  const name = peer.full_name || peer.display_name || "Membru";
  const label = isStaff(peer.role) ? (peer.role === "admin" || peer.shown_as_coach ? "Antrenor" : "Administrator") : peer.account_type ?? "Membru";
  const hint =
    label === "Administrator"
      ? "Feedback-ul tău este foarte important pentru noi. Scrie-ne!"
      : `Începe conversația cu ${name}. Doar voi doi vedeți mesajele.`;

  return (
    <ThreadShell backHref="/messages" name={name} subtitle={<span className="text-neon-green">{label} · conversație privată</span>}>
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
        emptyHint={hint}
      />
    </ThreadShell>
  );
}
