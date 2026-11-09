import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ReactionKey } from "./supabase/database.types";

type Client = SupabaseClient<Database>;
type DbError = { code?: string; message?: string } | null;
export type ReactionTarget = { kind: "post" | "comment"; id: string };

/**
 * Moves the viewer's reactions on a post or comment from `prev` (last state the server confirmed) to `next`.
 * Returns the reactions actually saved: before 0020_multi_reactions.sql only one reaction per user fits,
 * so a second one replaces the first.
 */
export async function saveReactions(
  supabase: Client,
  { kind, id }: ReactionTarget,
  userId: string,
  prev: ReactionKey[],
  next: ReactionKey[],
): Promise<{ error: DbError; saved: ReactionKey[] }> {
  const col = (kind === "post" ? "post_id" : "comment_id") as "post_id";
  const rows = () => supabase.from((kind === "post" ? "likes" : "comment_reactions") as "likes");
  let saved = [...prev];

  const removed = prev.filter((k) => !next.includes(k));
  if (removed.length) {
    const { error } = await rows().delete().eq(col, id).eq("user_id", userId).in("reaction", removed);
    if (error) return { error, saved };
    saved = saved.filter((k) => !removed.includes(k));
  }

  for (const reaction of next.filter((k) => !prev.includes(k))) {
    const { error } = await rows().insert({ [col]: id, user_id: userId, reaction } as { post_id: string; user_id: string; reaction: ReactionKey });
    if (error?.code === "23505") {
      // Already saved (e.g. from another tab).
      if (/_reaction_key/.test(error.message ?? "")) {
        saved.push(reaction);
        continue;
      }
      // Old single-reaction schema: switch the existing reaction instead.
      const res = await rows().update({ reaction }).eq(col, id).eq("user_id", userId);
      return res.error ? { error: res.error, saved } : { error: null, saved: [reaction] };
    }
    if (error) return { error, saved };
    saved.push(reaction);
  }
  return { error: null, saved };
}
