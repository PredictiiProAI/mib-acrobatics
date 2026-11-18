import { NextResponse, type NextRequest } from "next/server";
import { classAudience } from "@/lib/push-audience.server";
import { sendPush } from "@/lib/push.server";
import { clubNow, hhmm } from "@/lib/schedule";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/**
 * Called every 5 minutes (Supabase pg_cron, see supabase/cron/push_reminders.sql).
 * Reminds the class's group/city members (except those who said "Nu pot ajunge") and everyone who confirmed "Vin"
 * about today's classes starting in 50–60 minutes, once per class.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" }, { status: 500 });

  const now = clubNow();
  const nowMin = minutes(now.time);
  const { data: classes, error } = await admin.from("schedule").select("id, group_name, city, start_time, end_time").eq("day_of_week", now.day);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const due = (classes ?? []).filter((c: { start_time: string }) => {
    const lead = minutes(c.start_time) - nowMin;
    return lead > 50 && lead <= 60;
  });

  const results = [];
  for (const c of due as { id: string; group_name: string; city: string | null; start_time: string; end_time: string }[]) {
    const { data: claimed } = await admin
      .from("push_reminders_sent")
      .upsert({ schedule_id: c.id, session_date: now.date }, { onConflict: "schedule_id,session_date", ignoreDuplicates: true })
      .select("schedule_id");
    if (!claimed?.length) continue;
    const userIds = await classAudience([c], { date: now.date });
    const res = await sendPush(userIds, {
      title: "Antrenamentul tău începe într-o oră!",
      body: `${c.group_name} · ${hhmm(c.start_time)}–${hhmm(c.end_time)}. Ne vedem la sală!`,
      url: "/schedule",
      tag: `reminder-${c.id}-${now.date}`,
    });
    results.push({ class: c.group_name, start: hhmm(c.start_time), audience: userIds.length, ...res });
  }
  return NextResponse.json({ now: `${now.date} ${now.time}`, due: due.length, results });
}
