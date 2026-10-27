"use client";

import { Eye, EyeOff, Heart, Loader2, MessageCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/confirm-dialog";
import { deletePost, setPostVisibility } from "@/lib/actions/posts";
import type { FeedPost } from "@/lib/posts";
import { timeAgo } from "@/lib/time";

export function PostAdminCard({ post, isMine }: { post: FeedPost; isMine: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, confirmDialog] = useConfirm();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) setError(result.error ?? "Eroare.");
    });

  return (
    <li className={`glass overflow-hidden rounded-2xl transition ${pending ? "opacity-60" : ""}`}>
      <div className="relative aspect-[4/5] bg-black">
        {post.media_type === "video" ? (
          <video src={`${post.media_url}#t=0.1`} muted playsInline preload="metadata" controls className="size-full object-cover" />
        ) : (
          <Image src={post.media_url} alt={post.caption ?? "Postare"} fill sizes="(min-width: 1280px) 25vw, 50vw" className="object-cover" />
        )}
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur ${
            post.is_public ? "bg-neon-purple/20 text-neon-purple" : "bg-black/60 text-white/70"
          }`}
        >
          {post.is_public ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          {post.is_public ? "Public" : "Doar membri"}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <p className="line-clamp-2 min-h-10 text-sm text-white/80">{post.caption || <span className="text-white/30">Fără descriere</span>}</p>
        <div className="flex items-center gap-4 text-xs text-white/50">
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3.5" /> {post.like_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3.5" /> {post.comment_count}
          </span>
          <span className="ml-auto truncate" suppressHydrationWarning>
            {post.author_name ?? "—"} · {timeAgo(post.created_at)}
          </span>
        </div>
        {error && <p className="text-xs text-red-300">{error}</p>}
        <div className="flex gap-2">
          {isMine && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setPostVisibility(post.id, !post.is_public))}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:border-white/25 hover:text-white"
            >
              {post.is_public ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {post.is_public ? "Fă privată" : "Fă publică"}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              const ok = await confirm({ title: "Ștergi această postare?", description: "Postarea și fișierul ei media vor fi șterse definitiv.", confirmLabel: "Șterge definitiv" });
              if (ok) run(() => deletePost(post.id));
            }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Șterge
          </button>
        </div>
      </div>
      {confirmDialog}
    </li>
  );
}
