import type { Metadata } from "next";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = { title: "Mesaje" };

export default function InboxPage() {
  return (
    <section className="glass hidden flex-1 flex-col items-center justify-center gap-3 rounded-3xl p-8 text-center md:flex">
      <span className="grid size-16 place-items-center rounded-2xl bg-neon-orange/10 text-neon-orange">
        <MessageSquare className="size-8" />
      </span>
      <h1 className="font-display text-2xl font-black">Inbox antrenor</h1>
      <p className="max-w-sm text-sm text-white/55">Alege o conversație din stânga. Mesajele noi apar aici în timp real.</p>
    </section>
  );
}
