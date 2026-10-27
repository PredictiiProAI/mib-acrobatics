"use client";

import { Clock, Heart, MessageCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { RoleBadge } from "@/components/role-badge";
import { deletePost } from "@/lib/actions/posts";
import type { FeedPost } from "@/lib/posts";
import { isStaff } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import { applyReaction, DEFAULT_REACTION, reactionInfo, totalReactions, type ReactionKey } from "@/lib/reactions";
import { timeAgo } from "@/lib/time";
import { AutoplayVideo } from "./autoplay-video";
import { CommentsSheet } from "./comments-sheet";
import { ReactionSummary, ReactionTrigger } from "./reactions";
import type { Viewer } from "./types";

const fullDate = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short" });

export function PostCard({ post, viewer, priority, onDeleted }: { post: FeedPost; viewer: Viewer; priority?: boolean; onDeleted: (id: string) => void }) {
  const [mine, setMine] = useState<ReactionKey | null>(post.my_reaction ?? (post.liked_by_me ? DEFAULT_REACTION : null));
  const [counts, setCounts] = useState(post.reactions ?? {});
  const [comments, setComments] = useState(post.comment_count);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  async function react(next: ReactionKey | null) {
    const prev = mine;
    if (likeBusy || next === prev) return;
    setLikeBusy(true);
    setMine(next);
    setCounts((c) => applyReaction(c, prev, next));
    const likes = createClient().from("likes");
    const { error } = !next
      ? await likes.delete().eq("post_id", post.id).eq("user_id", viewer.id)
      : prev
        ? await likes.update({ reaction: next }).eq("post_id", post.id).eq("user_id", viewer.id)
        : await likes.insert({ post_id: post.id, user_id: viewer.id, reaction: next });
    if (error) {
      setMine(prev);
      setCounts((c) => applyReaction(c, next, prev));
    }
    setLikeBusy(false);
  }

  const doubleTapLike = () => {
    setBurst((b) => b + 1);
    if (!mine) react(DEFAULT_REACTION);
  };

  const total = totalReactions(counts);
  const mineInfo = mine ? reactionInfo(mine) : null;

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  async function remove() {
    const ok = await confirm({
      title: "Ștergi această postare?",
      description: "Postarea, aprecierile, comentariile și fișierul media vor fi șterse definitiv.",
      confirmLabel: "Șterge definitiv",
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    const result = await deletePost(post.id);
    if (result.ok) onDeleted(post.id);
    else {
      setDeleting(false);
      setError(result.error);
    }
  }

  const author = post.author_name ?? "MIB Acrobatics";
  const canDelete = post.author_id === viewer.id || isStaff(viewer.role);

  return (
    <article
      className={`mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-graphite/90 to-carbon/90 shadow-[0_20px_60px_-30px_rgb(168_85_247/0.5)] transition hover:border-neon-violet/25 hover:shadow-neon ${deleting ? "pointer-events-none opacity-50" : ""}`}
      data-testid="post-card"
    >
      <header className="flex items-center gap-3 px-5 py-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neon-violet to-neon-purple p-[2px]">
          <span className="grid size-full place-items-center rounded-full bg-carbon font-display text-base font-black text-white">{author[0]?.toUpperCase()}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="truncate font-semibold" data-testid="post-author">
              {author}
            </span>
            <RoleBadge role={post.author_role} />
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-white/45" title={fullDate.format(new Date(post.created_at))} suppressHydrationWarning>
            <Clock className="size-3" /> {timeAgo(post.created_at)}
          </p>
        </div>
        {canDelete && (
          <button type="button" onClick={remove} aria-label="Șterge postarea" className="rounded-xl p-2 text-white/40 transition hover:bg-red-500/10 hover:text-red-300">
            <Trash2 className="size-4" />
          </button>
        )}
      </header>

      <div className="px-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-black ring-1 ring-white/5" onDoubleClick={post.media_type === "image" ? doubleTapLike : undefined}>
          {post.media_type === "video" ? (
            <AutoplayVideo src={post.media_url} onDoubleClick={doubleTapLike} />
          ) : (
            <Image src={post.media_url} alt={post.caption ?? `Postare de ${author}`} fill priority={priority} sizes="(min-width: 640px) 552px, 100vw" className="object-cover" />
          )}
          {burst > 0 && (
            <Heart
              key={burst}
              className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 animate-[heart-pop_.8s_ease-out_forwards] fill-neon-violet text-neon-violet drop-shadow-[0_0_24px_rgb(168_85_247/0.8)]"
            />
          )}
        </div>
      </div>

      {post.caption && <p className="whitespace-pre-wrap break-words px-5 pt-4 text-[15px] leading-relaxed text-white/90">{post.caption}</p>}
      {error && <p className="px-5 pt-3 text-xs text-red-300">{error}</p>}
      <ReactionSummary counts={counts} mine={mine} className="px-5 pt-3" />

      <footer className="mt-4 flex items-center gap-2 border-t border-white/5 px-3 py-3">
        <div className="flex-1">
          <ReactionTrigger
            mine={mine}
            onReact={react}
            className={`group inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
              mine ? "bg-neon-violet/15 text-neon-violet ring-1 ring-neon-violet/40" : "bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            {mineInfo ? (
              <span className="animate-[pop-in_.2s_ease-out] text-lg leading-none">{mineInfo.emoji}</span>
            ) : (
              <Heart className="size-5 transition group-hover:text-neon-violet" />
            )}
            <span data-testid="like-count">{total}</span>
            <span className="font-medium">{mineInfo ? mineInfo.label : total === 1 ? "reacție" : "reacții"}</span>
          </ReactionTrigger>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Comentarii"
          className="group inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/[0.08] hover:text-white"
        >
          <MessageCircle className="size-5 group-hover:text-neon-purple" />
          <span data-testid="comment-count">{comments}</span>
          <span className="font-medium">{comments === 1 ? "comentariu" : "comentarii"}</span>
        </button>
      </footer>

      {sheetOpen && <CommentsSheet postId={post.id} viewer={viewer} onClose={closeSheet} onCountChange={setComments} />}
      {confirmDialog}
    </article>
  );
}
