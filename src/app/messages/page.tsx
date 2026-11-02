import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";
import { redirect } from "next/navigation";
import { COACH_THREAD } from "@/lib/messages";

export const metadata: Metadata = { title: "Mesaje" };

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const { draft } = await searchParams;
  if (typeof draft === "string") redirect(`/messages/${COACH_THREAD}?draft=${encodeURIComponent(draft.slice(0, 500))}`);

  return (
    <section className="glass hidden flex-1 flex-col items-center justify-center gap-3 rounded-3xl p-8 text-center md:flex">
      <span className="grid size-16 place-items-center rounded-2xl bg-neon-orange/10 text-neon-orange">
        <MessageSquare className="size-8" />
      </span>
      <h1 className="font-display text-2xl font-black">Mesaje</h1>
      <p className="max-w-sm text-sm text-white/55">Alege o conversație din stânga sau apasă „Mesaj nou” ca să scrii antrenorului sau unui coleg.</p>
    </section>
  );
}
