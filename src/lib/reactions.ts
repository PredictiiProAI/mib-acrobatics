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

/** Counts after the viewer's reactions go from `prev` to `next`. */
export function applyReactions(counts: ReactionCounts, prev: ReactionKey[], next: ReactionKey[]): ReactionCounts {
  const out = { ...counts };
  for (const k of prev) if (!next.includes(k)) out[k] = Math.max(0, (out[k] ?? 0) - 1);
  for (const k of next) if (!prev.includes(k)) out[k] = (out[k] ?? 0) + 1;
  return out;
}

export const toggleReaction = (list: ReactionKey[], key: ReactionKey) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

export const sameReactions = (a: ReactionKey[], b: ReactionKey[]) => a.length === b.length && a.every((k) => b.includes(k));

/** In picker order (👍 ❤️ 🔥 👏 🤸). */
export const sortReactions = (list: ReactionKey[]) => REACTIONS.filter((r) => list.includes(r.key)).map((r) => r.key);

export function countReactions(rows: { reaction: ReactionKey }[]): ReactionCounts {
  return rows.reduce<ReactionCounts>((acc, r) => ({ ...acc, [r.reaction]: (acc[r.reaction] ?? 0) + 1 }), {});
}
