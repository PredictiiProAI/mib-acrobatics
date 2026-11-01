import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ReactionKey } from "./supabase/database.types";

type Client = SupabaseClient<Database>;
type DbError = { code?: string; message?: string } | null;

// The `reaction` column comes from 0002_reactions.sql; fall back to a plain like if it hasn't been run.
const missingReactionColumn = (e: DbError) => !!e && (e.code === "PGRST204" || e.code === "42703") && /reaction/.test(e.message ?? "");

/** Persists the viewer's reaction on a post (null = remove), moving from the last state the server confirmed. */
export async function saveReaction(supabase: Client, postId: string, userId: string, prev: ReactionKey | null, next: ReactionKey | null): Promise<DbError> {
  const likes = () => supabase.from("likes");
  if (!next) return (await likes().delete().eq("post_id", postId).eq("user_id", userId)).error;

  if (prev) {
    const { data, error } = await likes().update({ reaction: next }).eq("post_id", postId).eq("user_id", userId).select("id");
    if (!error && data.length) return null;
    if (error && !missingReactionColumn(error)) return error;
    if (error) return null; // legacy schema: the like already exists, there is no reaction to change
  }

  let { error } = await likes().insert({ post_id: postId, user_id: userId, reaction: next });
  if (missingReactionColumn(error)) ({ error } = await likes().insert({ post_id: postId, user_id: userId }));
  if (error?.code === "23505") {
    // Already liked (e.g. from another tab): just switch the reaction.
    const res = await likes().update({ reaction: next }).eq("post_id", postId).eq("user_id", userId);
    return missingReactionColumn(res.error) ? null : res.error;
  }
  return error;
}
