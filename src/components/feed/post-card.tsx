"use client";

import { Heart, MessageCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { deletePost } from "@/lib/actions/posts";
import type { FeedPost } from "@/lib/posts";
import { isStaff, ROLE_LABEL } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/time";
import { AutoplayVideo } from "./autoplay-video";
import { CommentsSheet } from "./comments-sheet";
import type { Viewer } from "./types";

export function PostCard({ post, viewer, priority, onDeleted }: { post: FeedPost; viewer: Viewer; priority?: boolean; onDeleted: (id: string) => void }) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likes, setLikes] = useState(post.like_count);
  const [comments, setComments] = useState(post.comment_count);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [burst, setBurst] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);

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
    if (!confirm("Ștergi definitiv această postare?")) return;
    const result = await deletePost(post.id);
    if (result.ok) onDeleted(post.id);
    else alert(result.error);
  }

  const author = post.author_name ?? "MIB Acrobatics";
  const canDelete = post.author_id === viewer.id || isStaff(viewer.role);

  return (
    <article className="glass overflow-hidden rounded-3xl" data-testid="post-card">
      <header className="flex items-center gap-3 px-4 py-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-neon-orange to-neon-green font-black text-black">
          {author[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{author}</p>
          <p className="text-xs text-white/50" suppressHydrationWarning>
            <span className="text-neon-green">{ROLE_LABEL[post.author_role]}</span> · {timeAgo(post.created_at)}
          </p>
        </div>
        {canDelete && (
          <button type="button" onClick={remove} aria-label="Șterge postarea" className="rounded-xl p-2 text-white/40 transition hover:bg-red-500/10 hover:text-red-300">
            <Trash2 className="size-4" />
          </button>
        )}
      </header>

      <div className="relative aspect-[4/5] bg-black" onDoubleClick={post.media_type === "image" ? doubleTapLike : undefined}>
        {post.media_type === "video" ? (
          <AutoplayVideo src={post.media_url} onDoubleClick={doubleTapLike} />
        ) : (
          <Image src={post.media_url} alt={post.caption ?? `Postare de ${author}`} fill priority={priority} sizes="(min-width: 672px) 640px, 100vw" className="object-cover" />
        )}
        {burst > 0 && (
          <Heart
            key={burst}
            className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 animate-[heart-pop_.8s_ease-out_forwards] fill-neon-orange text-neon-orange drop-shadow-[0_0_24px_rgb(255_106_0/0.8)]"
          />
        )}
      </div>

      <div className="space-y-2 px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLike(!liked)}
            aria-pressed={liked}
            aria-label={liked ? "Retrage like-ul" : "Like"}
            className="group inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold transition hover:bg-white/5"
          >
            <Heart className={`size-6 transition active:scale-125 ${liked ? "fill-neon-orange text-neon-orange drop-shadow-[0_0_10px_rgb(255_106_0/0.7)]" : "text-white group-hover:text-neon-orange"}`} />
            <span data-testid="like-count">{likes}</span>
          </button>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Comentarii"
            className="group inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold transition hover:bg-white/5"
          >
            <MessageCircle className="size-6 group-hover:text-neon-green" />
            <span data-testid="comment-count">{comments}</span>
          </button>
        </div>
        {post.caption && (
          <p className="whitespace-pre-wrap break-words text-sm">
            <span className="mr-2 font-semibold">{author}</span>
            {post.caption}
          </p>
        )}
        {comments > 0 && (
          <button type="button" onClick={() => setSheetOpen(true)} className="text-sm text-white/50 hover:text-white/80">
            Vezi {comments === 1 ? "comentariul" : `toate cele ${comments} comentarii`}
          </button>
        )}
      </div>

      {sheetOpen && <CommentsSheet postId={post.id} viewer={viewer} onClose={closeSheet} onCountChange={setComments} />}
    </article>
  );
}
