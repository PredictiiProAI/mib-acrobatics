"use client";

import { Check, CheckCheck, Loader2, Paperclip, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { notifyDirectMessage } from "@/lib/actions/push";
import { createClient } from "@/lib/supabase/client";
import { ACCEPT_ATTR, MAX_UPLOAD_BYTES, mediaTypeFor } from "@/lib/media";

const DM_BUCKET = "dm_media";

type Message = Database["public"]["Tables"]["direct_messages"]["Row"] & { pending?: boolean };

const TZ = "Europe/Bucharest";
const timeFmt = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const dayFmt = new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const dayKey = (d: Date | string | number) => dayKeyFmt.format(new Date(d));

function dayLabel(iso: string) {
  const key = dayKey(iso);
  if (key === dayKey(Date.now())) return "Azi";
  if (key === dayKey(Date.now() - 86400000)) return "Ieri";
  return dayFmt.format(new Date(iso));
}

/** Private bucket: each attachment is shown through a short-lived signed URL (or the local preview while sending). */
function Attachment({ path, type, localUrl, onLoad }: { path: string; type: "image" | "video"; localUrl?: string; onLoad: () => void }) {
  const [signed, setSigned] = useState<{ path: string; url: string | null } | null>(null);
  useEffect(() => {
    if (localUrl) return;
    let live = true;
    createClient()
      .storage.from(DM_BUCKET)
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => live && setSigned({ path, url: data?.signedUrl ?? null }));
    return () => {
      live = false;
    };
  }, [path, localUrl]);
  const url = localUrl ?? (signed?.path === path ? signed.url : undefined);
  if (url === undefined) return <div className="mb-1 grid h-40 w-56 max-w-full place-items-center rounded-xl bg-black/30"><Loader2 className="size-5 animate-spin opacity-60" /></div>;
  if (url === null) return <p className="mb-1 text-xs opacity-70">Fișierul nu mai este disponibil.</p>;
  return type === "video" ? (
    <video src={url} controls playsInline preload="metadata" onLoadedMetadata={onLoad} className="mb-1 max-h-80 w-72 max-w-full rounded-xl bg-black" data-testid="msg-video" />
  ) : (
    <a href={url} target="_blank" rel="noopener" className="mb-1 block">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs from a private bucket */}
      <img src={url} alt="Fotografie" onLoad={onLoad} className="max-h-80 w-auto max-w-full rounded-xl object-contain" data-testid="msg-image" />
    </a>
  );
}

/**
 * Staff view (no `counterpartIds`): the conversation between a member (`threadUserId`) and the coaching staff;
 * everything not sent by the member is outgoing.
 * Member view (`counterpartIds`): messages between the viewer and those users; own messages are outgoing.
 */
export function ChatThread({
  viewerId,
  threadUserId,
  recipientId,
  initialMessages,
  pageSize,
  peerName,
  emptyHint,
  initialText = "",
  counterpartIds,
}: {
  viewerId: string;
  threadUserId: string;
  recipientId: string;
  initialMessages: Message[];
  pageSize: number;
  peerName: string;
  emptyHint: string;
  initialText?: string;
  counterpartIds?: string[];
}) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [hasOlder, setHasOlder] = useState(initialMessages.length === pageSize);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<{ file: File; url: string; type: "image" | "video" } | null>(null);
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const staffView = !counterpartIds && viewerId !== threadUserId;
  const isOutgoing = (m: Message) => (staffView ? m.sender_id !== threadUserId : m.sender_id === viewerId);
  const counterpartKey = counterpartIds?.join(",") ?? "";

  useEffect(() => {
    const others = counterpartKey ? counterpartKey.split(",") : null;
    const inThread = (m: Message) =>
      others
        ? (m.sender_id === viewerId && others.includes(m.receiver_id)) || (m.receiver_id === viewerId && others.includes(m.sender_id))
        : m.sender_id === threadUserId || m.receiver_id === threadUserId;
    const channel = supabase
      .channel(`dm:${threadUserId}:${viewerId}:${counterpartKey}`)
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
  }, [supabase, threadUserId, viewerId, counterpartKey]);

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
      .or(
        counterpartKey
          ? `and(sender_id.eq.${viewerId},receiver_id.in.(${counterpartKey})),and(sender_id.in.(${counterpartKey}),receiver_id.eq.${viewerId})`
          : `sender_id.eq.${threadUserId},receiver_id.eq.${threadUserId}`,
      )
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

  // Media sizes are known only after loading; stay pinned to the newest message if we were.
  const keepAtBottom = () => {
    const el = scroller.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  };

  function pickFile(f: File | undefined) {
    if (!f) return;
    const type = mediaTypeFor(f.type);
    if (!type) return setError("Poți trimite doar fotografii (JPG, PNG, WEBP, GIF, HEIC) sau video (MP4, MOV, WEBM).");
    if (f.size > MAX_UPLOAD_BYTES) return setError("Fișierul depășește 50 MB.");
    setError(null);
    setFile((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return { file: f, url: URL.createObjectURL(f), type };
    });
  }

  async function send() {
    const content = text.trim();
    const attachment = file;
    if (!content && !attachment) return;
    setText("");
    setFile(null);
    setError(null);
    const tempId = `tmp-${crypto.randomUUID()}`;
    const ext = attachment?.file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
    const attachment_path = attachment ? `${viewerId}/${recipientId}/${crypto.randomUUID()}.${ext}` : null;
    if (attachment && attachment_path) setLocalUrls((m) => ({ ...m, [attachment_path]: attachment.url }));
    stickToBottom.current = true;
    const optimistic: Message = {
      id: tempId,
      sender_id: viewerId,
      receiver_id: recipientId,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
      attachment_path,
      attachment_type: attachment?.type ?? null,
      pending: true,
    };
    setMessages((list) => [...list, optimistic]);
    const fail = (msg: string) => {
      setMessages((list) => list.filter((m) => m.id !== tempId));
      setText(content);
      if (attachment) setFile(attachment);
      setError(msg);
    };
    if (attachment && attachment_path) {
      const { error: upError } = await supabase.storage.from(DM_BUCKET).upload(attachment_path, attachment.file, { contentType: attachment.file.type, upsert: false });
      if (upError) return fail(`Fișierul nu a putut fi încărcat: ${upError.message}`);
    }
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({ sender_id: viewerId, receiver_id: recipientId, content, attachment_path, attachment_type: attachment?.type ?? null })
      .select("*")
      .single();
    if (error || !data) {
      if (attachment_path) await supabase.storage.from(DM_BUCKET).remove([attachment_path]);
      return fail("Mesajul nu a putut fi trimis.");
    }
    void notifyDirectMessage(data.id).catch(() => {});
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
          const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
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
                      ? "rounded-br-md bg-neon-orange text-onaccent shadow-neon-orange/10"
                      : "rounded-bl-md border border-white/10 bg-white/[0.06] text-white"
                  } ${m.pending ? "opacity-60" : ""}`}
                >
                  {m.attachment_path && m.attachment_type && <Attachment path={m.attachment_path} type={m.attachment_type} localUrl={localUrls[m.attachment_path]} onLoad={keepAtBottom} />}
                  {m.content.trim() && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                  <p className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${out ? "text-onaccent/60" : "text-white/40"}`}>
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
      {file && (
        <div className="flex items-center gap-3 border-t border-white/5 px-3 pt-3" data-testid="attachment-preview">
          {file.type === "video" ? (
            <video src={file.url} muted playsInline className="size-16 rounded-lg bg-black object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img src={file.url} alt="" className="size-16 rounded-lg object-cover" />
          )}
          <p className="min-w-0 flex-1 truncate text-xs text-white/60">{file.file.name}</p>
          <button
            type="button"
            onClick={() => {
              URL.revokeObjectURL(file.url);
              setFile(null);
            }}
            aria-label="Elimină fișierul"
            className="rounded-full p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-white/5 p-3"
      >
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          data-testid="attach-input"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          aria-label="Atașează fotografie sau video"
          className="rounded-xl border border-white/10 p-2.5 text-white/70 transition hover:border-neon-orange/50 hover:text-neon-orange"
          data-testid="attach-button"
        >
          <Paperclip className="size-5" />
        </button>
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
          disabled={!text.trim() && !file}
          aria-label="Trimite"
          className="rounded-xl bg-neon-orange p-2.5 text-onaccent transition hover:brightness-110 disabled:opacity-40"
        >
          <Send className="size-5" />
        </button>
      </form>
    </div>
  );
}
