import "server-only";
import { DEFAULT_HERO_TEXT } from "./acrofeed";
import { createClient } from "./supabase/server";

/** AcroFeed hero "Message of the Day"; falls back to the default until 0011 has run. */
export async function getHeroText() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_settings").select("acrofeed_hero_text").eq("id", true).maybeSingle();
  if (error) console.error("app_settings", error.message);
  return data?.acrofeed_hero_text || DEFAULT_HERO_TEXT;
}
