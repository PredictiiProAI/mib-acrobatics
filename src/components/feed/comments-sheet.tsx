"use client";

import { Loader2, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useConfirm } from "@/components/confirm-dialog";
import { deleteComment } from "@/lib/actions/posts";
import { isStaff, ROLE_LABEL } from "@/lib/roles";
import type { AppRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/time";
import type { Viewer } from "./types";

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author: { full_name: string | null; role: AppRole } | null;
};

const SELECT = "id, content, created_at, user_id, author:users!comments_user_id_fkey(full_name, role)";

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
  const listRef = useRef<HTMLUListElement>(null);
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
  }, [postId, supabase, onClose]);

  useEffect(() => {
    if (!comments) return;
    onCountChange(comments.length);
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [comments, onCountChange]);

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

  const canDelete = (c: CommentRow) => c.user_id === viewer.id || isStaff(viewer.role);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label="Comentarii">
      <button type="button" aria-label="Închide" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="glass relative flex max-h-[80svh] w-full max-w-lg animate-[sheet-up_.25s_ease-out] flex-col rounded-t-3xl md:rounded-3xl">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/20 md:hidden" />
        <header className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <h2 className="font-display text-lg font-bold">
            Comentarii {comments && <span className="text-neon-orange">{comments.length}</span>}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-white/60 hover:bg-white/5 hover:text-white" aria-label="Închide">
            <X className="size-5" />
          </button>
        </header>

        <ul ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {comments === null && (
            <li className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-neon-orange" />
            </li>
          )}
          {comments?.length === 0 && <li className="py-8 text-center text-sm text-white/50">Fii primul care comentează.</li>}
          {comments?.map((c) => {
            const name = c.author?.full_name ?? "Utilizator";
            return (
              <li key={c.id} className="group flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neon-orange to-neon-green text-sm font-black text-black">
                  {name[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{name}</span>
                    {c.author && c.author.role !== "user" && (
                      <span className="ml-2 rounded-full bg-neon-green/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-neon-green">
                        {ROLE_LABEL[c.author.role]}
                      </span>
                    )}
                    <span className="ml-2 text-xs text-white/40" suppressHydrationWarning>
                      {timeAgo(c.created_at)}
                    </span>
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-white/85">{c.content}</p>
                </div>
                {canDelete(c) && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    aria-label="Șterge comentariul"
                    className="self-start rounded-lg p-1.5 text-white/30 transition hover:bg-red-500/10 hover:text-red-300 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {error && <p className="px-5 pb-2 text-xs text-red-300">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2 border-t border-white/5 p-4"
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
            maxLength={2000}
            autoFocus
            placeholder="Scrie un comentariu…"
            className="max-h-32 flex-1 resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-neon-orange/70"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Trimite"
            className="rounded-xl bg-neon-orange p-2.5 text-black transition hover:brightness-110 disabled:opacity-40"
          >
            {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          </button>
        </form>
      </div>
      {confirmDialog}
    </div>,
    document.body,
  );
}
