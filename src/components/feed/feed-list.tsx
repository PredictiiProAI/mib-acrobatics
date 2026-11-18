"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeedPost } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";
import { PostCard } from "./post-card";
import type { Viewer } from "./types";

export const FEED_PAGE_SIZE = 6;

/** Prepends posts newer than what the list already has (server re-render, realtime, tab refocus). */
function mergeNewest(list: FeedPost[], fresh: FeedPost[]) {
  const ids = new Set(list.map((p) => p.id));
  const added = fresh.filter((p) => !ids.has(p.id));
  return added.length ? [...added, ...list] : list;
}

const TZ = "Europe/Bucharest";
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const dayLabelFmt = new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });

function dayLabel(key: string, iso: string) {
  const today = dayKeyFmt.format(new Date());
  const yesterday = dayKeyFmt.format(new Date(Date.now() - 864e5));
  return key === today ? "Astăzi" : key === yesterday ? "Ieri" : dayLabelFmt.format(new Date(iso));
}

const postCount = (n: number) => `${n} ${n === 1 ? "postare" : n % 100 >= 20 || (n >= 100 && n % 100 === 0) ? "de postări" : "postări"}`;

/** Posts grouped by Bucharest calendar day, newest first. */
function groupByDay(posts: FeedPost[]) {
  const days: { key: string; label: string; posts: FeedPost[] }[] = [];
  for (const p of posts) {
    const key = dayKeyFmt.format(new Date(p.created_at));
    const last = days.at(-1);
    if (last?.key === key) last.posts.push(p);
    else days.push({ key, label: dayLabel(key, p.created_at), posts: [p] });
  }
  return days;
}

export function FeedList({ initialPosts, viewer }: { initialPosts: FeedPost[]; viewer: Viewer }) {
  const [posts, setPosts] = useState(initialPosts);
  const [seenInitial, setSeenInitial] = useState(initialPosts);
  if (seenInitial !== initialPosts) {
    setSeenInitial(initialPosts);
    setPosts((list) => mergeNewest(list, initialPosts));
  }
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

  const fetchNewest = useCallback(async () => {
    const { data, error } = await createClient()
      .from("feed_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(FEED_PAGE_SIZE);
    if (error) console.error("feed refresh", error.message);
    else setPosts((list) => mergeNewest(list, data));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("feed-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, () => fetchNewest())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, ({ old }) => {
        const id = (old as { id?: string }).id;
        if (id) setPosts((list) => list.filter((p) => p.id !== id));
      })
      .subscribe();
    const onVisible = () => document.visibilityState === "visible" && fetchNewest();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      supabase.removeChannel(channel);
    };
  }, [fetchNewest]);

  const removePost = useCallback((id: string) => setPosts((list) => list.filter((p) => p.id !== id)), []);
  const days = useMemo(() => groupByDay(posts), [posts]);
  // Only the newest day is open by default; a tap flips a day away from its default.
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const isOpen = (key: string, i: number) => (i === 0) !== !!flipped[key];

  if (!posts.length) {
    return (
      <div className="glass mx-auto w-full max-w-xl rounded-3xl p-10 text-center">
        <p className="font-display text-xl font-bold">Încă nu există postări</p>
        <p className="mt-2 text-sm text-white/60">Primele videoclipuri și fotografii de la antrenamente apar aici în curând.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {days.map((day, i) => {
        const open = isOpen(day.key, i);
        return (
          <section key={day.key} className="mx-auto w-full max-w-xl space-y-4" data-testid="feed-day" data-open={open}>
            <button
              type="button"
              onClick={() => setFlipped((f) => ({ ...f, [day.key]: !f[day.key] }))}
              aria-expanded={open}
              className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] ${
                open ? "border-neon-orange/60 bg-neon-orange/10" : "border-white/10 bg-carbon/80 hover:border-neon-orange/50"
              }`}
              data-testid="feed-day-header"
            >
              <span className="font-display text-sm font-bold first-letter:uppercase">
                {day.label} <span className="font-sans font-semibold text-white/50">• {postCount(day.posts.length)}</span>
              </span>
              <ChevronDown className={`size-5 shrink-0 text-neon-green transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div className="grid grid-rows-[1fr] opacity-100 transition-all duration-300 ease-out starting:grid-rows-[0fr] starting:opacity-0">
                <div className="min-h-0 space-y-6 overflow-hidden">
                  {day.posts.map((post, j) => (
                    <PostCard key={post.id} post={post} viewer={viewer} priority={i === 0 && j === 0} onDeleted={removePost} />
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
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
