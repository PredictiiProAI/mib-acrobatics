"use client";

import { Check, CheckCheck, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";

type Message = Database["public"]["Tables"]["direct_messages"]["Row"] & { pending?: boolean };

const timeFmt = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long" });

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Azi";
  if (d.toDateString() === yesterday.toDateString()) return "Ieri";
  return dayFmt.format(d);
}

/**
 * One conversation between a member (`threadUserId`) and the coaching staff.
 * Staff view: everything not sent by the member is outgoing. Member view: own messages are outgoing.
 */
export function ChatThread({
  viewerId,
  threadUserId,
  recipientId,
  initialMessages,
  pageSize,
  peerName,
  emptyHint,
}: {
  viewerId: string;
  threadUserId: string;
  recipientId: string;
  initialMessages: Message[];
  pageSize: number;
  peerName: string;
  emptyHint: string;
}) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [hasOlder, setHasOlder] = useState(initialMessages.length === pageSize);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const staffView = viewerId !== threadUserId;
  const isOutgoing = (m: Message) => (staffView ? m.sender_id !== threadUserId : m.sender_id === viewerId);

  useEffect(() => {
    const inThread = (m: Message) => m.sender_id === threadUserId || m.receiver_id === threadUserId;
    const channel = supabase
      .channel(`dm:${threadUserId}:${viewerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const m = payload.new as Message;
        if (!inThread(m)) return;
        stickToBottom.current = true;
        setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, (payload) => {
        const m = payload.new as Message;
        setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, read_at: m.read_at } : x)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, threadUserId, viewerId]);

  // Mark incoming messages addressed to me as read while the thread is open.
  useEffect(() => {
    const unread = messages.filter((m) => m.receiver_id === viewerId && !m.read_at && !m.pending).map((m) => m.id);
    if (!unread.length) return;
    const readAt = new Date().toISOString();
    supabase
      .from("direct_messages")
      .update({ read_at: readAt })
      .in("id", unread)
      .then(({ error }) => {
        if (error) return;
        setMessages((list) => list.map((m) => (unread.includes(m.id) ? { ...m, read_at: readAt } : m)));
        router.refresh();
      });
  }, [messages, viewerId, supabase, router]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function loadOlder() {
    const first = messages.find((m) => !m.pending);
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    const el = scroller.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${threadUserId},receiver_id.eq.${threadUserId}`)
      .lt("created_at", first.created_at)
      .order("created_at", { ascending: false })
      .limit(pageSize);
    const older = (data ?? []).reverse();
    stickToBottom.current = false;
    setMessages((list) => [...older.filter((o) => !list.some((x) => x.id === o.id)), ...list]);
    setHasOlder(older.length === pageSize);
    setLoadingOlder(false);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - prevHeight;
    });
  }

  async function send() {
    const content = text.trim();
    if (!content) return;
    setText("");
    setError(null);
    const tempId = `tmp-${crypto.randomUUID()}`;
    stickToBottom.current = true;
    const optimistic: Message = {
      id: tempId,
      sender_id: viewerId,
      receiver_id: recipientId,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
      pending: true,
    };
    setMessages((list) => [...list, optimistic]);
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({ sender_id: viewerId, receiver_id: recipientId, content })
      .select("*")
      .single();
    if (error || !data) {
      setMessages((list) => list.filter((m) => m.id !== tempId));
      setText(content);
      setError("Mesajul nu a putut fi trimis.");
      return;
    }
    setMessages((list) => {
      const withoutTemp = list.filter((m) => m.id !== tempId);
      return withoutTemp.some((m) => m.id === data.id) ? withoutTemp : [...withoutTemp, data];
    });
    if (staffView) router.refresh();
  }

  const lastOutgoing = [...messages].reverse().find(isOutgoing);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 space-y-1.5 overflow-y-auto px-4 py-5"
        data-testid="chat-scroller"
      >
        {hasOlder && (
          <div className="flex justify-center pb-3">
            <button type="button" onClick={loadOlder} className="rounded-full bg-white/5 px-4 py-1.5 text-xs text-white/60 hover:text-white">
              {loadingOlder ? <Loader2 className="size-4 animate-spin" /> : "Încarcă mesajele mai vechi"}
            </button>
          </div>
        )}
        {messages.length === 0 && <p className="py-16 text-center text-sm text-white/50">{emptyHint}</p>}
        {messages.map((m, i) => {
          const out = isOutgoing(m);
          const prev = messages[i - 1];
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
          const groupStart = newDay || !prev || isOutgoing(prev) !== out;
          return (
            <Fragment key={m.id}>
              {newDay && (
                <p className="py-3 text-center text-[11px] uppercase tracking-widest text-white/35" suppressHydrationWarning>
                  {dayLabel(m.created_at)}
                </p>
              )}
              <div className={`flex ${out ? "justify-end" : "justify-start"} ${groupStart ? "pt-2" : ""}`}>
                <div
                  data-testid={out ? "msg-out" : "msg-in"}
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-lg ${
                    out
                      ? "rounded-br-md bg-neon-orange text-black shadow-neon-orange/10"
                      : "rounded-bl-md border border-white/10 bg-white/[0.06] text-white"
                  } ${m.pending ? "opacity-60" : ""}`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${out ? "text-black/60" : "text-white/40"}`}>
                    <span suppressHydrationWarning>{timeFmt.format(new Date(m.created_at))}</span>
                    {out && m.id === lastOutgoing?.id && !m.pending && (m.read_at ? <CheckCheck className="size-3.5" aria-label="Văzut" /> : <Check className="size-3.5" aria-label="Trimis" />)}
                  </p>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>

      {error && <p className="px-4 pb-1 text-xs text-red-300">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-white/5 p-3"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder={`Scrie-i lui ${peerName}…`}
          aria-label="Mesaj"
          className="max-h-32 flex-1 resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-neon-orange/70"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Trimite"
          className="rounded-xl bg-neon-orange p-2.5 text-black transition hover:brightness-110 disabled:opacity-40"
        >
          <Send className="size-5" />
        </button>
      </form>
    </div>
  );
}
