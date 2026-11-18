"use server";

import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./posts";

const PLATFORMS = ["web", "android", "ios"] as const;

export async function registerPushToken(token: string, platform: (typeof PLATFORMS)[number]): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "Intră în cont ca să activezi notificările." };
  if (typeof token !== "string" || token.length < 10 || token.length > 4096 || !PLATFORMS.includes(platform)) return { ok: false, error: "Token invalid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_push_token", { p_token: token, p_platform: platform });
  if (error) {
    console.error("registerPushToken", error.message);
    return { ok: false, error: "Notificările nu au putut fi activate. Încearcă din nou." };
  }
  return { ok: true };
}

export async function unregisterPushToken(token: string): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me || typeof token !== "string") return { ok: false, error: "Cerere invalidă." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("unregister_push_token", { p_token: token });
  if (error) return { ok: false, error: "Notificările nu au putut fi dezactivate." };
  return { ok: true };
}
