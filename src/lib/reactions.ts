import type { ReactionKey } from "./supabase/database.types";

export type { ReactionKey };
export type ReactionCounts = Partial<Record<ReactionKey, number>>;

/** Must match the check constraints in supabase/migrations/0002_reactions.sql. */
export const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: "like", emoji: "👍", label: "Like" },
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "fire", emoji: "🔥", label: "Foc" },
  { key: "clap", emoji: "👏", label: "Bravo" },
  { key: "acro", emoji: "🤸", label: "Acrobat" },
];

export const DEFAULT_REACTION: ReactionKey = "love";
export const reactionInfo = (key: ReactionKey) => REACTIONS.find((r) => r.key === key)!;

export const totalReactions = (counts: ReactionCounts) => Object.values(counts).reduce((a, n) => a + (n ?? 0), 0);

/** Counts after the viewer switches from `prev` to `next` (null = no reaction). */
export function applyReaction(counts: ReactionCounts, prev: ReactionKey | null, next: ReactionKey | null): ReactionCounts {
  const out = { ...counts };
  if (prev) out[prev] = Math.max(0, (out[prev] ?? 0) - 1);
  if (next) out[next] = (out[next] ?? 0) + 1;
  return out;
}

export function countReactions(rows: { reaction: ReactionKey }[]): ReactionCounts {
  return rows.reduce<ReactionCounts>((acc, r) => ({ ...acc, [r.reaction]: (acc[r.reaction] ?? 0) + 1 }), {});
}
