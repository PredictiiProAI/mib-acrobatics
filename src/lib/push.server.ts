import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { createAdminClient } from "./supabase/admin";

export type PushMessage = { title: string; body: string; url?: string; tag?: string };
export type PushResult = { recipients: number; tokens: number; sent: number; failed: number; skipped?: string; platforms?: Record<string, number> };

/** Android channel created by the app (PushListener); high importance gives sound + heads-up banner. */
export const ANDROID_CHANNEL_ID = "mib_alerts";

function firebaseApp(): App | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  const existing = getApps().find((a) => a.name === "mib-push");
  if (existing) return existing;
  try {
    const sa = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    return initializeApp({ credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }) }, "mib-push");
  } catch (e) {
    console.error("push: invalid FIREBASE_SERVICE_ACCOUNT", e instanceof Error ? e.message : e);
    return null;
  }
}

const DEAD = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"]);

/**
 * Sends one notification to the given users (or every user with a device when `userIds` is "all").
 * `respectScheduleSetting` skips members who turned off schedule notifications in /profil.
 */
export async function sendPush(userIds: string[] | "all", msg: PushMessage, opts: { respectScheduleSetting?: boolean; exclude?: string[] } = {}): Promise<PushResult> {
  const empty = (skipped: string): PushResult => ({ recipients: 0, tokens: 0, sent: 0, failed: 0, skipped });
  if (userIds !== "all" && userIds.length === 0) return empty("no recipients");
  const admin = createAdminClient();
  if (!admin) return empty("SUPABASE_SERVICE_ROLE_KEY missing");

  let query = admin.from("push_tokens").select("token, user_id, platform");
  if (userIds !== "all") query = query.in("user_id", userIds);
  const { data: rows, error } = await query;
  if (error) {
    console.error("push tokens", error.message);
    return empty(error.message);
  }
  let targets = (rows ?? []) as { token: string; user_id: string; platform: string }[];
  if (opts.exclude?.length) targets = targets.filter((t) => !opts.exclude!.includes(t.user_id));
  if (opts.respectScheduleSetting && targets.length) {
    const { data: off } = await admin.from("user_settings").select("user_id").eq("notify_schedule", false);
    const muted = new Set((off ?? []).map((r: { user_id: string }) => r.user_id));
    targets = targets.filter((t) => !muted.has(t.user_id));
  }
  const recipients = new Set(targets.map((t) => t.user_id)).size;
  if (!targets.length) return { recipients: 0, tokens: 0, sent: 0, failed: 0 };

  const app = firebaseApp();
  if (!app) return { recipients, tokens: targets.length, sent: 0, failed: 0, skipped: "FIREBASE_SERVICE_ACCOUNT missing" };

  const link = msg.url ?? "/schedule";
  let sent = 0;
  let failed = 0;
  const platforms: Record<string, number> = {};
  const dead: string[] = [];
  for (let i = 0; i < targets.length; i += 500) {
    const batch = targets.slice(i, i + 500).map((t) => t.token);
    const res = await getMessaging(app).sendEachForMulticast({
      tokens: batch,
      notification: { title: msg.title, body: msg.body },
      data: { url: link, title: msg.title, body: msg.body, ...(msg.tag ? { tag: msg.tag } : {}) },
      android: {
        priority: "high",
        notification: { tag: msg.tag, color: "#8b00ff", channelId: ANDROID_CHANNEL_ID, sound: "default", defaultVibrateTimings: true, priority: "max", visibility: "public" },
      },
      webpush: { headers: { Urgency: "high" }, fcmOptions: { link } },
    });
    sent += res.successCount;
    failed += res.failureCount;
    res.responses.forEach((r, j) => {
      if (r.success) platforms[targets[i + j].platform] = (platforms[targets[i + j].platform] ?? 0) + 1;
      else if (r.error) {
        console.error("push failed", targets[i + j].platform, r.error.code);
        if (DEAD.has(r.error.code)) dead.push(batch[j]);
      }
    });
  }
  if (dead.length) await admin.from("push_tokens").delete().in("token", dead);
  return { recipients, tokens: targets.length, sent, failed, platforms };
}
