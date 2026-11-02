import { cookies } from "next/headers";

export const SEEN_SECTIONS = ["posts", "comments", "users"] as const;
export type SeenSection = (typeof SEEN_SECTIONS)[number];
export const seenCookie = (section: SeenSection) => `acromib_seen_${section}`;

/** When this admin last opened the section on this device (cookie value "<userId>:<epoch ms>"), or null. */
export async function seenAt(section: SeenSection, userId: string): Promise<number | null> {
  const value = (await cookies()).get(seenCookie(section))?.value;
  const [uid, ms] = value?.split(":") ?? [];
  return uid === userId && Number(ms) > 0 ? Number(ms) : null;
}
