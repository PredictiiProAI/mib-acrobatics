"use server";

import { getSessionUser } from "@/lib/auth";
import { sendPush } from "@/lib/push.server";
import { isStaff } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
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

const BURST_MS = 2 * 60 * 1000;

/** Push for a private message the signed-in member just sent; one push per burst of unread messages. */
export async function notifyDirectMessage(messageId: string): Promise<void> {
  const me = await getSessionUser();
  const admin = createAdminClient();
  if (!me || !admin || typeof messageId !== "string") return;
  const { data: msg } = await admin
    .from("direct_messages")
    .select("id, sender_id, receiver_id, content, attachment_type, created_at")
    .eq("id", messageId)
    .maybeSingle();
  if (!msg || msg.sender_id !== me.id || Date.now() - new Date(msg.created_at).getTime() > BURST_MS) return;

  const since = new Date(new Date(msg.created_at).getTime() - BURST_MS).toISOString();
  const [{ count: recent }, { data: setting, error: settingError }, { data: receiver }, { data: sender }] = await Promise.all([
    admin
      .from("direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", msg.sender_id)
      .eq("receiver_id", msg.receiver_id)
      .is("read_at", null)
      .gte("created_at", since)
      .lt("created_at", msg.created_at),
    admin.from("user_settings").select("notify_messages").eq("user_id", msg.receiver_id).maybeSingle(),
    admin.from("users").select("role").eq("id", msg.receiver_id).maybeSingle(),
    admin.from("users").select("full_name, display_name").eq("id", msg.sender_id).maybeSingle(),
  ]);
  if (recent) return;
  if (!settingError && setting?.notify_messages === false) return;

  const name = sender?.display_name || sender?.full_name || "Mesaj nou";
  const text = msg.content?.trim();
  const body = text ? (text.length > 120 ? `${text.slice(0, 117)}…` : text) : msg.attachment_type === "video" ? "🎬 Video" : msg.attachment_type ? "📷 Foto" : "Mesaj nou";
  const base = receiver && isStaff(receiver.role) ? "/dashboard/messages" : "/messages";
  await sendPush([msg.receiver_id], { title: name, body, url: `${base}/${msg.sender_id}`, tag: `dm-${msg.sender_id}` });
}
