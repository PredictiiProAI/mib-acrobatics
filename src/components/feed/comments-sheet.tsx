"use client";

import { Loader2, Maximize2, MessageCircle, Minimize2, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { useConfirm } from "@/components/confirm-dialog";
import { RoleBadge } from "@/components/role-badge";
import { deleteComment } from "@/lib/actions/posts";
import { countReactions, reactionInfo, type ReactionKey } from "@/lib/reactions";
import { isStaff } from "@/lib/roles";
import type { AppRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/time";
import { ReactionSummary, ReactionTrigger } from "./reactions";
import type { Viewer } from "./types";

type ReactionRow = { user_id: string; reaction: ReactionKey };
type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: { full_name: string | null; role: AppRole } | null;
  reactions: ReactionRow[];
};

const SELECT = "id, content, created_at, user_id, author:users!comments_user_id_fkey(full_name, role), reactions:comment_reactions(user_id, reaction)";
const fullDate = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short" });

/** Pixels the mobile drawer must be dragged before it expands / collapses / closes. */
const EXPAND_DRAG = 60;
const CLOSE_DRAG = 120;

export function CommentsSheet({
  postId,
  viewer,
  onClose,
  onCountChange,
}: {
  postId: string;
  viewer: Viewer;
  onClose: () => void;
  onCountChange: (count: number) => void;
}) {
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const dragStart = useRef<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const idsRef = useRef<Set<string>>(new Set());
  const [supabase] = useState(createClient);
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    let active = true;
    supabase
      .from("comments")
      .select(SELECT)
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError("Comentariile nu au putut fi încărcate.");
        setComments((data as CommentRow[] | null) ?? []);
      });

    const upsert = (row: CommentRow) => setComments((list) => (list && !list.some((c) => c.id === row.id) ? [...list, row] : list));
    const refreshReactions = async (commentId: string) => {
      const { data } = await supabase.from("comment_reactions").select("user_id, reaction").eq("comment_id", commentId);
      if (active && data) setComments((list) => list?.map((c) => (c.id === commentId ? { ...c, reactions: data } : c)) ?? list);
    };
    const channel = supabase
      .channel(`comments:${postId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` }, async (payload) => {
        const { data } = await supabase.from("comments").select(SELECT).eq("id", (payload.new as { id: string }).id).maybeSingle();
        if (data && active) upsert(data as CommentRow);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "comments" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setComments((list) => list?.filter((c) => c.id !== id) ?? list);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comment_reactions" }, (payload) => {
        const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Partial<ReactionRow & { comment_id: string }>;
        if (row.comment_id && row.user_id !== viewer.id && idsRef.current.has(row.comment_id)) refreshReactions(row.comment_id);
      })
      .subscribe();

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      active = false;
      supabase.removeChannel(channel);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [postId, supabase, onClose, viewer.id]);

  const count = comments?.length;
  useEffect(() => {
    idsRef.current = new Set(comments?.map((c) => c.id));
  }, [comments]);
  useEffect(() => {
    if (count === undefined) return;
    onCountChange(count);
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [count, onCountChange]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: postId, user_id: viewer.id, content })
      .select(SELECT)
      .single();
    setSending(false);
    if (error || !data) return setError("Comentariul nu a putut fi trimis.");
    setText("");
    setComments((list) => (list && !list.some((c) => c.id === data.id) ? [...list, data as CommentRow] : list));
  }

  async function remove(id: string) {
    if (!(await confirm({ title: "Ștergi acest comentariu?", description: "Comentariul va fi eliminat definitiv.", confirmLabel: "Șterge" }))) return;
    const result = await deleteComment(id);
    if (!result.ok) return setError(result.error);
    setComments((list) => list?.filter((c) => c.id !== id) ?? list);
  }

  const setMyReaction = (commentId: string, next: ReactionKey | null) =>
    setComments(
      (list) =>
        list?.map((c) =>
          c.id === commentId
            ? { ...c, reactions: [...c.reactions.filter((r) => r.user_id !== viewer.id), ...(next ? [{ user_id: viewer.id, reaction: next }] : [])] }
            : c,
        ) ?? list,
    );

  async function reactToComment(c: CommentRow, next: ReactionKey | null) {
    const prev = c.reactions.find((r) => r.user_id === viewer.id)?.reaction ?? null;
    if (prev === next) return;
    setMyReaction(c.id, next);
    const table = supabase.from("comment_reactions");
    const { error } = !next
      ? await table.delete().eq("comment_id", c.id).eq("user_id", viewer.id)
      : prev
        ? await table.update({ reaction: next }).eq("comment_id", c.id).eq("user_id", viewer.id)
        : await table.insert({ comment_id: c.id, user_id: viewer.id, reaction: next });
    if (error) {
      setMyReaction(c.id, prev);
      setError("Reacția nu a putut fi salvată.");
    }
  }

  const canDelete = (c: CommentRow) => c.user_id === viewer.id || isStaff(viewer.role);

  // Mobile drawer drag: up expands to full height, down collapses (or closes when already collapsed).
  const onDragStart = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragStart.current = e.clientY;
    setDrag(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: ReactPointerEvent) => {
    if (dragStart.current !== null) setDrag(e.clientY - dragStart.current);
  };
  const onDragEnd = () => {
    if (dragStart.current === null) return;
    const dy = drag ?? 0;
    dragStart.current = null;
    setDrag(null);
    if (dy < -EXPAND_DRAG) setExpanded(true);
    else if (dy > CLOSE_DRAG) {
      if (expanded) setExpanded(false);
      else onClose();
    }
  };

  const style = {
    "--sheet-h": expanded ? "calc(100svh - 0.75rem)" : "72svh",
    transform: drag && drag > 0 ? `translateY(${drag}px)` : undefined,
  } as CSSProperties;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-stretch md:justify-end" role="dialog" aria-modal="true" aria-label="Comentarii">
      <button type="button" aria-label="Închide" onClick={onClose} className="absolute inset-0 animate-[fade-in_.2s_ease-out] bg-black/70 backdrop-blur-sm" />
      <aside
        style={style}
        data-testid="comments-panel"
        data-expanded={expanded}
        className={`relative flex h-[var(--sheet-h)] w-full max-w-2xl animate-[sheet-up_.25s_ease-out] flex-col overflow-hidden rounded-t-[2rem] border border-b-0 border-white/10 bg-carbon/95 shadow-[0_-20px_60px_-20px_rgb(192_132_252/0.35)] backdrop-blur-2xl md:h-full md:w-[30rem] md:max-w-none md:animate-[slide-in_.25s_ease-out] md:rounded-l-[2rem] md:rounded-tr-none md:border-b md:border-r-0 lg:w-[34rem] ${
          drag === null ? "transition-[height,transform] duration-300 ease-out" : ""
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-violet/70 to-transparent" />
        <div onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd} className="touch-none select-none md:touch-auto">
          <div className="flex justify-center pb-1 pt-3 md:hidden" data-testid="drawer-handle">
            <span className="h-1.5 w-12 rounded-full bg-white/25" />
          </div>
          <header className="flex items-center gap-3 border-b border-white/5 px-5 pb-4 pt-2 md:px-6 md:pt-6">
            <span className="grid size-10 place-items-center rounded-2xl bg-neon-violet/10 text-neon-violet">
              <MessageCircle className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-extrabold">Comentarii</h2>
              <p className="text-xs text-white/45">{comments ? (comments.length === 1 ? "1 comentariu" : `${comments.length} comentarii`) : "Se încarcă…"}</p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Micșorează" : "Extinde"}
              className="rounded-full p-2 text-white/60 hover:bg-white/5 hover:text-white md:hidden"
            >
              {expanded ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
            </button>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-white/60 hover:bg-white/5 hover:text-white" aria-label="Închide">
              <X className="size-5" />
            </button>
          </header>
        </div>

        <ul ref={listRef} className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4 md:px-4">
          {comments === null && (
            <li className="flex justify-center py-12">
              <Loader2 className="size-7 animate-spin text-neon-violet" />
            </li>
          )}
          {comments?.length === 0 && (
            <li className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="text-4xl">🤸</span>
              <p className="font-semibold">Niciun comentariu încă</p>
              <p className="text-sm text-white/50">Fii primul care comentează.</p>
            </li>
          )}
          {comments?.map((c) => {
            const name = c.author?.full_name ?? "Utilizator";
            const mine = c.reactions.find((r) => r.user_id === viewer.id)?.reaction ?? null;
            const mineInfo = mine ? reactionInfo(mine) : null;
            return (
              <li key={c.id} className="group flex gap-3 rounded-2xl px-2 py-3 transition hover:bg-white/[0.02]" data-testid="comment">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neon-violet to-neon-purple p-[2px]">
                  <span className="grid size-full place-items-center rounded-full bg-carbon text-sm font-black">{name[0]?.toUpperCase()}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">{name}</span>
                    {c.author && <RoleBadge role={c.author.role} />}
                    <span className="text-xs text-white/40" title={fullDate.format(new Date(c.created_at))} suppressHydrationWarning>
                      {timeAgo(c.created_at)}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words rounded-2xl rounded-tl-md bg-white/[0.05] px-4 py-3 text-[15px] leading-relaxed text-white/90 ring-1 ring-white/5">
                    {c.content}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ReactionTrigger
                      mine={mine}
                      onReact={(next) => reactToComment(c, next)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        mine ? "text-neon-violet" : "text-white/50 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {mineInfo ? (
                        <>
                          <span className="text-sm leading-none">{mineInfo.emoji}</span> {mineInfo.label}
                        </>
                      ) : (
                        "Reacționează"
                      )}
                    </ReactionTrigger>
                    <ReactionSummary counts={countReactions(c.reactions)} mine={mine} />
                    {canDelete(c) && (
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        aria-label="Șterge comentariul"
                        className="ml-auto rounded-lg p-1.5 text-white/30 transition hover:bg-red-500/10 hover:text-red-300 md:opacity-0 md:group-hover:opacity-100"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {error && <p className="px-6 pb-2 text-xs text-red-300">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-3 border-t border-white/5 bg-black/20 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6"
        >
          <span className="hidden size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neon-violet to-neon-purple text-sm font-black text-black sm:grid">
            {viewer.name[0]?.toUpperCase()}
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            maxLength={2000}
            autoFocus
            placeholder="Scrie un comentariu…"
            className="max-h-40 min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-[15px] outline-none placeholder:text-white/30 focus:border-neon-violet/70"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Trimite"
            className="rounded-2xl bg-neon-violet p-3 text-black transition hover:brightness-110 disabled:opacity-40"
          >
            {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          </button>
        </form>
        {confirmDialog}
      </aside>
    </div>,
    document.body,
  );
}
