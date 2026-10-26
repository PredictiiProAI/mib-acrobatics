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

  return <FeedList initialPosts={posts ?? []} viewer={{ id: user.id, role: user.role, name: user.fullName ?? user.email }} />;
}
