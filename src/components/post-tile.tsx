"use client";

import Image from "next/image";
import { Heart, MessageCircle, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FeedPost } from "@/lib/posts";

/** Public post preview on the landing page; opens the full photo or the video with sound and controls. */
export function PostTile({ post }: { post: FeedPost }) {
  const [open, setOpen] = useState(false);
  const isVideo = post.media_type === "video";
  const alt = post.caption ?? "Postare MIB Acrobatics";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <figure className="group glass relative aspect-[4/5] overflow-hidden rounded-2xl">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={isVideo ? "Vezi videoclipul" : "Vezi fotografia"}
          className="absolute inset-0 z-10 cursor-pointer"
          data-testid="post-tile-open"
        />
        {isVideo ? (
          <video src={post.media_url} muted loop playsInline autoPlay preload="metadata" className="size-full object-cover" />
        ) : (
          <Image src={post.media_url} alt={alt} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />
        )}
        {isVideo && (
          <span className="theme-dark pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full bg-black/50 ring-1 ring-white/30 backdrop-blur-sm transition group-hover:scale-110">
              <Play className="ml-0.5 size-6 fill-white text-white" />
            </span>
          </span>
        )}
        <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4">
          {post.caption && <p className="line-clamp-2 text-sm">{post.caption}</p>}
          <div className="mt-2 flex items-center gap-4 text-xs text-white/60">
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3.5" /> {post.like_count}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="size-3.5" /> {post.comment_count}
            </span>
            {post.author_name && <span className="ml-auto truncate">@{post.author_name}</span>}
          </div>
        </figcaption>
      </figure>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            className="theme-dark fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4"
            onClick={() => setOpen(false)}
            data-testid="post-viewer"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Închide"
              className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <X className="size-5" />
            </button>
            <div className="flex max-h-full w-full max-w-3xl flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
              {isVideo ? (
                <video src={post.media_url} controls autoPlay playsInline className="max-h-[80svh] w-auto max-w-full rounded-2xl bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.media_url} alt={alt} className="max-h-[80svh] w-auto max-w-full rounded-2xl object-contain" />
              )}
              {(post.caption || post.author_name) && (
                <p className="max-w-full text-center text-sm text-white/80">
                  {post.caption}
                  {post.author_name && <span className="ml-2 text-white/50">@{post.author_name}</span>}
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
