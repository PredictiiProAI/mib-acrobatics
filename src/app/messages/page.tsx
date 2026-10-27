import type { Metadata } from "next";
import { ChatThread } from "@/components/chat/chat-thread";
import { requireUser } from "@/lib/auth";
import { getCoach, getThread, THREAD_PAGE_SIZE } from "@/lib/messages";

export const metadata: Metadata = { title: "Mesaje" };

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const { draft } = await searchParams;
  const user = await requireUser("/messages");
  const [coach, messages] = await Promise.all([getCoach(), getThread(user.id)]);
  const coachName = coach?.full_name ?? "Antrenor";

  return (
    <section className="glass flex h-[calc(100svh-11rem)] lg:h-[calc(100svh-6.5rem)] flex-col overflow-hidden rounded-3xl">
      <header className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <span className="relative grid size-10 place-items-center rounded-full bg-gradient-to-br from-neon-violet to-neon-purple font-black text-black">
          {coachName[0]?.toUpperCase()}
        </span>
        <div>
          <p className="font-semibold">{coachName}</p>
          <p className="text-xs text-neon-purple">Antrenor MIB Acrobatics</p>
        </div>
      </header>
      {coach ? (
        <ChatThread
          viewerId={user.id}
          threadUserId={user.id}
          recipientId={coach.id}
          initialMessages={messages}
          pageSize={THREAD_PAGE_SIZE}
          peerName={coachName}
          initialText={typeof draft === "string" ? draft.slice(0, 500) : ""}
          emptyHint="Ai o întrebare despre antrenamente? Scrie-i direct antrenorului."
        />
      ) : (
        <p className="flex flex-1 items-center justify-center p-8 text-center text-white/50">Antrenorul nu este încă disponibil pentru mesaje.</p>
      )}
    </section>
  );
}
