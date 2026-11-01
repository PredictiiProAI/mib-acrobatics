"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Conversation } from "@/lib/messages";
import { ROLE_LABEL } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/time";

export function InboxList({ conversations }: { conversations: Conversation[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [supabase] = useState(createClient);
  const inThread = pathname !== "/dashboard/messages";

  useEffect(() => {
    const channel = supabase
      .channel("dm:inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  const q = query.trim().toLowerCase();
  const list = q ? conversations.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) : conversations;

  return (
    <aside className={`glass min-h-0 flex-col overflow-hidden rounded-3xl md:flex md:w-80 ${inThread ? "hidden" : "flex"}`}>
      <div className="border-b border-white/5 p-3">
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm focus-within:border-neon-orange/70">
          <Search className="size-4 text-white/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Caută conversații…" className="w-full bg-transparent outline-none placeholder:text-white/30" />
        </label>
      </div>
      <ul className="flex-1 overflow-y-auto" data-testid="inbox-list">
        {list.length === 0 && (
          <li className="p-6 text-center text-sm text-white/50">
            {conversations.length ? "Nicio conversație găsită." : "Încă nu ți-a scris nimeni. Poți începe o conversație din Utilizatori."}
          </li>
        )}
        {list.map((c) => {
          const active = pathname === `/dashboard/messages/${c.userId}`;
          return (
            <li key={c.userId}>
              <Link
                href={`/dashboard/messages/${c.userId}`}
                className={`flex items-center gap-3 border-l-2 px-4 py-3 transition ${active ? "border-neon-orange bg-neon-orange/10" : "border-transparent hover:bg-white/5"}`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neon-orange to-neon-green font-black text-black">
                  {c.name[0]?.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-sm ${c.unread ? "font-bold text-white" : "font-semibold text-white/85"}`}>{c.name}</span>
                    <span className="shrink-0 text-[10px] text-white/40" suppressHydrationWarning>
                      {timeAgo(c.lastAt)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-xs ${c.unread ? "text-white" : "text-white/50"}`}>
                      {c.lastFromUser ? "" : "Tu: "}
                      {c.lastMessage}
                    </span>
                    {c.unread > 0 && (
                      <span className="ml-auto grid min-w-5 shrink-0 place-items-center rounded-full bg-neon-green px-1 text-[10px] font-black text-black">{c.unread}</span>
                    )}
                  </span>
                  {c.role !== "user" && <span className="text-[10px] uppercase text-neon-green">{ROLE_LABEL[c.role]}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
