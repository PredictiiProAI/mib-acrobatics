import "server-only";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/env";
import type { Database } from "./supabase/database.types";

export type FeedPost = Database["public"]["Views"]["feed_posts"]["Row"];

export async function getLatestPublicPosts(limit = 4): Promise<FeedPost[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feed_posts")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) console.error("getLatestPublicPosts", error.message);
  return data ?? [];
}
