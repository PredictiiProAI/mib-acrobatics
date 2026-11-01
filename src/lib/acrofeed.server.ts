import "server-only";
import { DEFAULT_HERO_TEXT, QUICK_LINKS_MAX, type AnnouncementTone, type FeedSettings, type QuickLink } from "./acrofeed";
import { createClient } from "./supabase/server";

const TONES: AnnouncementTone[] = ["important", "success", "urgent", "info"];

/** AcroMib settings row; falls back to defaults until 0011/0012 have run. */
export async function getFeedSettings(): Promise<FeedSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", true).maybeSingle();
  if (error) console.error("app_settings", error.message);
  const links = Array.isArray(data?.quick_links) ? (data.quick_links as QuickLink[]) : [];
  return {
    heroText: data?.acrofeed_hero_text || DEFAULT_HERO_TEXT,
    announcement: {
      enabled: Boolean(data?.announcement_enabled && data.announcement_text),
      text: data?.announcement_text ?? "",
      tone: TONES.includes(data?.announcement_tone as AnnouncementTone) ? (data!.announcement_tone as AnnouncementTone) : "important",
    },
    links: links.filter((l) => l && typeof l.title === "string" && typeof l.url === "string").slice(0, QUICK_LINKS_MAX),
  };
}
