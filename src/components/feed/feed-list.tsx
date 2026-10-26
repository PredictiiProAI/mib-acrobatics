"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedPost } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import { PostCard } from "./post-card";
import type { Viewer } from "./types";

export const FEED_PAGE_SIZE = 6;

export function FeedList({ initialPosts, viewer }: { initialPosts: FeedPost[]; viewer: Viewer }) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length === FEED_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    const last = posts.at(-1);
    if (!last || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);
    // Keyset pagination on (created_at, id) so rows with equal timestamps aren't skipped.
    const { data, error } = await createClient()
      .from("feed_posts")
      .select("*")
      .or(`created_at.lt."${last.created_at}",and(created_at.eq."${last.created_at}",id.lt.${last.id})`)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(FEED_PAGE_SIZE);
    if (error) setError(true);
    else {
      setPosts((list) => [...list, ...data.filter((p) => !list.some((x) => x.id === p.id))]);
      setHasMore(data.length === FEED_PAGE_SIZE);
    }
    loadingRef.current = false;
    setLoading(false);
  }, [posts]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || error) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && loadMore(), { rootMargin: "1200px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, error]);

  const removePost = useCallback((id: string) => setPosts((list) => list.filter((p) => p.id !== id)), []);

  if (!posts.length) {
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <p className="font-display text-xl font-bold">Încă nu există postări</p>
        <p className="mt-2 text-sm text-white/60">Primele videoclipuri și fotografii de la antrenamente apar aici în curând.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post, i) => (
        <PostCard key={post.id} post={post} viewer={viewer} priority={i === 0} onDeleted={removePost} />
      ))}
      <div ref={sentinel} className="flex justify-center py-6 text-sm text-white/40">
        {loading && <Loader2 className="size-6 animate-spin text-neon-orange" />}
        {error && (
          <button type="button" onClick={loadMore} className="text-neon-orange hover:underline">
            Eroare la încărcare. Reîncearcă
          </button>
        )}
        {!hasMore && !loading && <span>Ai văzut tot. Revino după următorul antrenament!</span>}
      </div>
    </div>
  );
}
