"use client";

import { Avatar } from "@/components/avatar";
import { Loader2, Send, Trash2, ChevronUp, Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { RoleBadge } from "@/components/role-badge";
import { deleteComment } from "@/lib/actions/posts";
import { saveReactions } from "@/lib/likes";
import { countReactions, DEFAULT_REACTION, reactionInfo, sameReactions, sortReactions, type ReactionKey } from "@/lib/reactions";
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
  author: { full_name: string | null; display_name?: string | null; avatar_url?: string | null; role: AppRole } | null;
  reactions: ReactionRow[];
  pending?: boolean;
};

// Full select first; the plain one keeps comments working if 0002/0005 (reactions, avatars) haven't been run.
const SELECTS = [
  "id, content, created_at, user_id, author:users!comments_user_id_fkey(full_name, display_name, avatar_url, role), reactions:comment_reactions(user_id, reaction)",
  "id, content, created_at, user_id, author:users!comments_user_id_fkey(full_name, role)",
];
const fullDate = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short" });

type Client = ReturnType<typeof createClient>;

async function fetchComments(supabase: Client, filter: { post_id: string } | { id: string }) {
  let lastError: unknown = null;
  for (const select of SELECTS) {
    let query = supabase.from("comments").select(select);
    query = "id" in filter ? query.eq("id", filter.id) : query.eq("post_id", filter.post_id);
    const { data, error } = await query.order("created_at", { ascending: true });
    if (!error) return { rows: ((data ?? []) as unknown as CommentRow[]).map((c) => ({ ...c, reactions: c.reactions ?? [] })), error: null };
    lastError = error;
  }
  return { rows: [] as CommentRow[], error: lastError };
}

/** Facebook-style comments section that expands under a post: list + "Adaugă un comentariu..." input. */
export function CommentsSection({
  postId,
  viewer,
  onCountChange,
  onCollapse,
}: {
  postId: string;
  viewer: Viewer;
  onCountChange: (count: number) => void;
  onCollapse?: () => void;
}) {
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ id: string; n: number } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idsRef = useRef<Set<string>>(new Set());
  const reactionQueue = useRef(new Map<string, Promise<void>>());
  const [supabase] = useState(createClient);
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    let active = true;
    inputRef.current?.focus({ preventScroll: true });
    fetchComments(supabase, { post_id: postId }).then(({ rows, error }) => {
      if (!active) return;
      if (error) {
        console.error("comments", error);
        setError("Comentariile nu au putut fi încărcate.");
      }
      setComments(rows);
    });

    const refreshReactions = async (commentId: string) => {
      const { data } = await supabase.from("comment_reactions").select("user_id, reaction").eq("comment_id", commentId);
      if (active && data) setComments((list) => list?.map((c) => (c.id === commentId ? { ...c, reactions: data } : c)) ?? list);
    };
    const channel = supabase
      .channel(`comments:${postId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `post_id=eq.${postId}` }, async (payload) => {
        const row = payload.new as { id: string; user_id: string };
        if (row.user_id === viewer.id) return; // our own comments are already in the list
        const { rows } = await fetchComments(supabase, { id: row.id });
        if (active && rows[0]) setComments((list) => (list && !list.some((c) => c.id === row.id) ? [...list, rows[0]] : list));
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

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [postId, supabase, viewer.id]);

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
    if (!content) return;
    setError(null);
    setText("");
    // Optimistic: show the comment at once, then swap in the saved row (or roll back).
    const tempId = `temp-${crypto.randomUUID()}`;
    const draft: CommentRow = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      user_id: viewer.id,
      author: { full_name: viewer.name, display_name: viewer.name, avatar_url: viewer.avatarUrl, role: viewer.role },
      reactions: [],
      pending: true,
    };
    setComments((list) => [...(list ?? []), draft]);

    const { data, error } = await supabase.from("comments").insert({ post_id: postId, user_id: viewer.id, content }).select("id, created_at").single();
    if (error || !data) {
      console.error("comment", error);
      setComments((list) => list?.filter((c) => c.id !== tempId) ?? list);
      setText((t) => t || content);
      setError("Comentariul nu a putut fi trimis. Încearcă din nou.");
      return;
    }
    setComments((list) => list?.map((c) => (c.id === tempId ? { ...c, id: data.id, created_at: data.created_at, pending: false } : c)) ?? list);
  }

  async function remove(id: string) {
    if (!(await confirm({ title: "Ștergi acest comentariu?", description: "Comentariul va fi eliminat definitiv.", confirmLabel: "Șterge" }))) return;
    const result = await deleteComment(id);
    if (!result.ok) return setError(result.error);
    setComments((list) => list?.filter((c) => c.id !== id) ?? list);
  }

  const myReactions = (c: CommentRow) => sortReactions(c.reactions.filter((r) => r.user_id === viewer.id).map((r) => r.reaction));
  const setMyReactions = (commentId: string, next: ReactionKey[]) =>
    setComments(
      (list) =>
        list?.map((c) =>
          c.id === commentId
            ? { ...c, reactions: [...c.reactions.filter((r) => r.user_id !== viewer.id), ...next.map((reaction) => ({ user_id: viewer.id, reaction }))] }
            : c,
        ) ?? list,
    );

  // Optimistic; saves for the same comment run one after another so fast taps stay in order.
  function reactToComment(c: CommentRow, next: ReactionKey[]) {
    const prev = myReactions(c);
    if (sameReactions(prev, next)) return;
    setMyReactions(c.id, next);
    const run = (reactionQueue.current.get(c.id) ?? Promise.resolve()).then(async () => {
      const { error, saved } = await saveReactions(supabase, { kind: "comment", id: c.id }, viewer.id, prev, next);
      if (error) setError("Reacția nu a putut fi salvată.");
      if (error || !sameReactions(saved, next)) setMyReactions(c.id, saved);
    });
    reactionQueue.current.set(c.id, run);
  }

  function heartComment(c: CommentRow) {
    setBurst((b) => ({ id: c.id, n: (b?.n ?? 0) + 1 }));
    const mine = myReactions(c);
    if (!mine.includes(DEFAULT_REACTION)) reactToComment(c, [...mine, DEFAULT_REACTION]);
  }

  const canDelete = (c: CommentRow) => !c.pending && (c.user_id === viewer.id || isStaff(viewer.role));

  return (
    <section className="animate-[fade-in_.2s_ease-out] border-t border-white/5 bg-black/20 px-4 pb-4 pt-3" data-testid="comments-section" aria-label="Comentarii">
      <ul ref={listRef} className="max-h-[28rem] space-y-1 overflow-y-auto overscroll-contain">
        {comments === null && (
          <li className="flex justify-center py-6">
            <Loader2 className="size-6 animate-spin text-neon-orange" />
          </li>
        )}
        {comments?.length === 0 && <li className="py-4 text-center text-sm text-white/50">Niciun comentariu încă. Fii primul care comentează.</li>}
        {comments?.map((c) => {
          const name = c.author?.display_name || c.author?.full_name || "Utilizator";
          const mine = myReactions(c);
          return (
            <li key={c.id} className={`group flex gap-2.5 py-2 ${c.pending ? "opacity-60" : ""}`} data-testid="comment">
              <Avatar name={name} url={c.author?.avatar_url} className="size-9" />
              <div className="min-w-0 flex-1">
                <div
                  className="relative inline-block max-w-full rounded-2xl rounded-tl-md bg-white/[0.06] px-3.5 py-2 ring-1 ring-white/5"
                  onDoubleClick={c.pending ? undefined : () => heartComment(c)}
                >
                  {burst?.id === c.id && (
                    <Heart
                      key={burst.n}
                      className="pointer-events-none absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 animate-[heart-pop_.8s_ease-out_forwards] fill-neon-orange text-neon-orange"
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold" data-testid="comment-author">
                      {name}
                    </span>
                    {c.author && <RoleBadge role={c.author.role} />}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-snug text-white/90" data-testid="comment-text">
                    {c.content}
                  </p>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 px-2 text-xs">
                  <span className="text-white/40" title={fullDate.format(new Date(c.created_at))} suppressHydrationWarning data-testid="comment-time">
                    {c.pending ? "Se trimite…" : timeAgo(c.created_at)}
                  </span>
                  <ReactionSummary counts={countReactions(c.reactions)} mine={mine} source={{ kind: "comment", id: c.id }} />
                  {canDelete(c) && (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      aria-label="Șterge comentariul"
                      className="ml-auto rounded-lg p-1 text-white/30 transition hover:bg-red-500/10 hover:text-red-300 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {!c.pending && (
                <ReactionTrigger
                  mine={mine}
                  onReact={(next) => reactToComment(c, next)}
                  label="Îmi place"
                  align="right"
                  rootClassName="shrink-0 self-center"
                  pickerClassName="grid size-9 place-items-center rounded-full text-white/45 transition hover:text-white active:scale-90 [&_svg]:size-[18px]"
                  className={`grid size-9 place-items-center rounded-full transition active:scale-90 ${mine.length ? "text-neon-orange" : "text-white/45 hover:text-white"}`}
                >
                  {mine.length && !mine.includes(DEFAULT_REACTION) ? (
                    <span className="text-lg leading-none">{reactionInfo(mine[0]).emoji}</span>
                  ) : (
                    <Heart className={`size-[18px] ${mine.length ? "fill-neon-orange" : ""}`} data-testid="comment-heart" />
                  )}
                </ReactionTrigger>
              )}
            </li>
          );
        })}
      </ul>

      {error && <p className="pt-2 text-xs text-red-300">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex items-center gap-2.5"
      >
        <Avatar name={viewer.name} url={viewer.avatarUrl} className="size-9" />
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          enterKeyHint="send"
          placeholder="Adaugă un comentariu..."
          aria-label="Adaugă un comentariu"
          data-testid="comment-input"
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 text-[15px] outline-none placeholder:text-white/35 focus:border-neon-orange/70"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Trimite comentariul"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-neon-orange text-onaccent transition hover:brightness-110 disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
      {confirmDialog}
      {onCollapse && (
        <button
          type="button"
          onClick={onCollapse}
          data-testid="comments-collapse"
          className="mx-auto mt-3 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white/55 transition hover:bg-white/5 hover:text-neon-green"
        >
          <ChevronUp className="size-4" /> Restrânge
        </button>
      )}
    </section>
  );
}
