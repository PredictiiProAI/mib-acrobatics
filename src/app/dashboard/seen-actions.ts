"use server";

import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { SEEN_SECTIONS, seenCookie, type SeenSection } from "./seen";

/** Clears the Command Center badge of a section: only items newer than this visit count again. */
export async function markSectionSeen(section: SeenSection) {
  if (!SEEN_SECTIONS.includes(section)) return;
  const user = await getSessionUser();
  if (!user) return;
  (await cookies()).set(seenCookie(section), `${user.id}:${Date.now()}`, {
    path: "/dashboard",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
