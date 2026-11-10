"use client";

import { Avatar } from "@/components/avatar";
import { Clock, Heart, MessageCircle, Smile, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { RoleBadge } from "@/components/role-badge";
import { badgeRole } from "@/lib/roles";
import { deletePost } from "@/lib/actions/posts";
import { saveReactions } from "@/lib/likes";
import type { FeedPost } from "@/lib/posts";
import { isStaff } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import { applyReactions, DEFAULT_REACTION, reactionInfo, sameReactions, sortReactions, type ReactionKey } from "@/lib/reactions";
import { timeAgo } from "@/lib/time";
import { AutoplayVideo } from "./autoplay-video";
import { CommentsSection } from "./comments-section";
import { ReactionSummary, ReactionTrigger } from "./reactions";
import type { Viewer } from "./types";

const fullDate = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short" });

export function PostCard({ post, viewer, priority, onDeleted }: { post: FeedPost; viewer: Viewer; priority?: boolean; onDeleted: (id: string) => void }) {
  const [mine, setMine] = useState<ReactionKey[]>(() =>
    sortReactions(post.my_reactions ?? (post.my_reaction ? [post.my_reaction] : post.liked_by_me ? [DEFAULT_REACTION] : [])),
  );
  const [counts, setCounts] = useState(post.reactions ?? (post.like_count ? { [DEFAULT_REACTION]: post.like_count } : {}));
  const [comments, setComments] = useState(post.comment_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsMounted, setCommentsMounted] = useState(false);
  const toggleComments = () => {
    if (commentsMounted) return setCommentsOpen((v) => !v);
    setCommentsMounted(true);
    requestAnimationFrame(() => setCommentsOpen(true));
  };
  const [burst, setBurst] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  // Optimistic: the UI follows every tap at once; a single sync loop then moves the server from its
  // last confirmed state to the latest wanted one, so fast toggles are never dropped.
  const confirmed = useRef<ReactionKey[]>(mine);
  const wanted = useRef<ReactionKey[]>(mine);
  const syncing = useRef(false);

  async function syncReaction() {
    if (syncing.current) return;
    syncing.current = true;
    const supabase = createClient();
    while (!sameReactions(wanted.current, confirmed.current)) {
      const target = wanted.current;
      const { error, saved } = await saveReactions(supabase, { kind: "post", id: post.id }, viewer.id, confirmed.current, target);
      confirmed.current = saved;
      const shown = wanted.current;
      if (error || (!sameReactions(saved, target) && shown === target)) {
        // Show what the server really has (rolled back, or a single reaction on the old schema).
        wanted.current = saved;
        setMine(sortReactions(saved));
        setCounts((c) => applyReactions(c, shown, saved));
      }
      if (error) {
        console.error("like", error);
        setError("Nu am putut salva reacția. Încearcă din nou.");
        break;
      }
    }
    syncing.current = false;
  }

  function react(next: ReactionKey[]) {
    const prev = wanted.current;
    if (sameReactions(prev, next)) return;
    wanted.current = next;
    setError(null);
    setMine(sortReactions(next));
    setCounts((c) => applyReactions(c, prev, next));
    void syncReaction();
  }

  const doubleTapLike = () => {
    setBurst((b) => b + 1);
    if (!wanted.current.includes(DEFAULT_REACTION)) react([...wanted.current, DEFAULT_REACTION]);
  };

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
      className={`-mx-4 w-[calc(100%+2rem)] overflow-hidden border-y border-white/10 md:mx-auto md:w-full md:max-w-xl md:rounded-3xl md:border-x bg-gradient-to-b from-graphite/90 to-carbon/90 shadow-[0_20px_60px_-30px_rgb(255_106_0/0.5)] transition hover:border-neon-orange/25 hover:shadow-neon ${deleting ? "pointer-events-none opacity-50" : ""}`}
      data-testid="post-card"
    >
      <header className="flex items-center gap-3 px-4 py-3 md:px-5 md:py-4">
        <Avatar name={author} url={post.author_avatar} className="size-11" textClassName="text-base" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="truncate font-semibold" data-testid="post-author">
              {author}
            </span>
            <RoleBadge role={badgeRole(post.author_role, post.author_shown_as_coach)} />
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

      <div className="md:px-3">
        <div className="relative aspect-[4/5] overflow-hidden bg-black md:rounded-2xl md:ring-1 md:ring-white/5" onDoubleClick={post.media_type === "image" ? doubleTapLike : undefined}>
          {post.media_type === "video" ? (
            <AutoplayVideo src={post.media_url} onDoubleClick={doubleTapLike} />
          ) : (
            <Image src={post.media_url} alt={post.caption ?? `Postare de ${author}`} fill priority={priority} sizes="(min-width: 768px) 552px, 100vw" className="object-cover" />
          )}
          {burst > 0 && (
            <Heart
              key={burst}
              className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 animate-[heart-pop_.8s_ease-out_forwards] fill-neon-orange text-neon-orange drop-shadow-[0_0_24px_rgb(255_106_0/0.8)]"
            />
          )}
        </div>
      </div>

      {post.caption && <p className="whitespace-pre-wrap break-words px-4 pt-4 md:px-5 text-[15px] leading-relaxed text-white/90">{post.caption}</p>}
      {error && <p className="px-4 pt-3 md:px-5 text-xs text-red-300">{error}</p>}
      <ReactionSummary counts={counts} mine={mine} source={{ kind: "post", id: post.id }} hint className="mx-4 mt-2 md:mx-5" />

      <footer className="mt-1 flex items-center gap-1 px-2 pb-2 md:px-3">
        <ReactionTrigger
          mine={mine}
          onReact={react}
          label={mine.length ? "Reacțiile tale" : "Reacționează"}
          rootClassName="shrink-0"
          className="grid size-11 place-items-center rounded-full bg-transparent p-2 text-white/55 transition hover:bg-white/[0.06] hover:text-white active:scale-90"
        >
          {mine.length ? (
            <span key={mine.join()} className="animate-[pop-in_.2s_ease-out] text-2xl leading-none">
              {reactionInfo(mine[0]).emoji}
            </span>
          ) : (
            <Smile className="size-6" strokeWidth={1.75} />
          )}
        </ReactionTrigger>
        <button
          type="button"
          onClick={toggleComments}
          aria-expanded={commentsOpen}
          aria-label={`${comments} ${comments === 1 ? "comentariu" : "comentarii"}`}
          data-testid="comments-toggle"
          className={`inline-flex h-11 items-center gap-1.5 rounded-full bg-transparent px-2.5 text-sm font-semibold transition hover:bg-white/[0.06] active:scale-90 ${
            commentsOpen ? "text-neon-green" : "text-white/55 hover:text-white"
          }`}
        >
          <MessageCircle className="size-6" strokeWidth={1.75} />
          <span data-testid="comment-count">{comments}</span>
        </button>
      </footer>

      {commentsMounted && (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${commentsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          aria-hidden={!commentsOpen}
          inert={!commentsOpen}
          data-testid="comments-wrapper"
          data-open={commentsOpen}
        >
          <div className="min-h-0 overflow-hidden">
            <CommentsSection postId={post.id} viewer={viewer} onCountChange={setComments} onCollapse={() => setCommentsOpen(false)} />
          </div>
        </div>
      )}
      {confirmDialog}
    </article>
  );
}
