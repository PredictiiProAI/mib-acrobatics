import type { Metadata } from "next";
import { FEED_PAGE_SIZE, FeedList } from "@/components/feed/feed-list";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "AcroFeed" };

export default async function FeedPage() {
  const user = await requireUser("/feed");
  const supabase = await createClient();
  const { data: posts, error } = await supabase
    .from("feed_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(FEED_PAGE_SIZE);
  if (error) console.error("feed", error.message);
  const firstName = (user.fullName || user.email.split("@")[0]).split(" ")[0];

  return (
    <div className="space-y-6">
      <section className="relative mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neon-orange/15 via-carbon to-neon-green/10 p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-neon-orange/20 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-green">AcroFeed</p>
        <h1 className="mt-2 font-display text-2xl font-black sm:text-3xl">Salut, {firstName}!</h1>
        <p className="mt-1 text-sm text-white/60">Cele mai noi momente de la antrenamente. Apasă inima sau dă dublu-click ca să apreciezi.</p>
      </section>
      <FeedList initialPosts={posts ?? []} viewer={{ id: user.id, role: user.role, name: user.fullName ?? user.email }} />
    </div>
  );
}
