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
import { timeAgo } from "@/lib/time";
import { AutoplayVideo } from "./autoplay-video";
import { CommentsSheet } from "./comments-sheet";
import type { Viewer } from "./types";

const fullDate = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short" });

export function PostCard({ post, viewer, priority, onDeleted }: { post: FeedPost; viewer: Viewer; priority?: boolean; onDeleted: (id: string) => void }) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likes, setLikes] = useState(post.like_count);
  const [comments, setComments] = useState(post.comment_count);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  async function setLike(next: boolean) {
    if (likeBusy || next === liked) return;
    setLikeBusy(true);
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    const supabase = createClient();
    const { error } = next
      ? await supabase.from("likes").insert({ post_id: post.id, user_id: viewer.id })
      : await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", viewer.id);
    if (error && error.code !== "23505") {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
    }
    setLikeBusy(false);
  }

  const doubleTapLike = () => {
    setBurst((b) => b + 1);
    setLike(true);
  };

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
      className={`mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-graphite/90 to-carbon/90 shadow-[0_20px_60px_-30px_rgb(255_106_0/0.5)] transition hover:border-neon-orange/25 ${deleting ? "pointer-events-none opacity-50" : ""}`}
      data-testid="post-card"
    >
      <header className="flex items-center gap-3 px-5 py-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neon-orange to-neon-green p-[2px]">
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
              className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 animate-[heart-pop_.8s_ease-out_forwards] fill-neon-orange text-neon-orange drop-shadow-[0_0_24px_rgb(255_106_0/0.8)]"
            />
          )}
        </div>
      </div>

      {post.caption && <p className="whitespace-pre-wrap break-words px-5 pt-4 text-[15px] leading-relaxed text-white/90">{post.caption}</p>}
      {error && <p className="px-5 pt-3 text-xs text-red-300">{error}</p>}

      <footer className="mt-4 flex items-center gap-2 border-t border-white/5 px-3 py-3">
        <button
          type="button"
          onClick={() => setLike(!liked)}
          aria-pressed={liked}
          aria-label={liked ? "Retrage like-ul" : "Like"}
          className={`group inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
            liked ? "bg-neon-orange/15 text-neon-orange ring-1 ring-neon-orange/40" : "bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white"
          }`}
        >
          <Heart className={`size-5 transition active:scale-125 ${liked ? "fill-neon-orange drop-shadow-[0_0_10px_rgb(255_106_0/0.7)]" : "group-hover:text-neon-orange"}`} />
          <span data-testid="like-count">{likes}</span>
          <span className="font-medium text-current/70">{likes === 1 ? "apreciere" : "aprecieri"}</span>
        </button>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Comentarii"
          className="group inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/[0.08] hover:text-white"
        >
          <MessageCircle className="size-5 group-hover:text-neon-green" />
          <span data-testid="comment-count">{comments}</span>
          <span className="font-medium">{comments === 1 ? "comentariu" : "comentarii"}</span>
        </button>
      </footer>

      {sheetOpen && <CommentsSheet postId={post.id} viewer={viewer} onClose={closeSheet} onCountChange={setComments} />}
      {confirmDialog}
    </article>
  );
}
