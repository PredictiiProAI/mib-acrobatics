import Image from "next/image";
import { Heart, MessageCircle, Play } from "lucide-react";
import type { FeedPost } from "@/lib/posts";

export function PostTile({ post }: { post: FeedPost }) {
  return (
    <figure className="group glass relative aspect-[4/5] overflow-hidden rounded-2xl">
      {post.media_type === "video" ? (
        <video src={post.media_url} muted loop playsInline autoPlay preload="metadata" className="size-full object-cover" />
      ) : (
        <Image
          src={post.media_url}
          alt={post.caption ?? "Postare MIB Acrobatics"}
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      )}
      {post.media_type === "video" && <Play className="absolute right-3 top-3 size-5 fill-white/80 text-white/80" />}
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4">
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
  );
}
