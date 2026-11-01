import "server-only";
import type { GalleryImage, TeamMember } from "./about";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

export async function getAboutContent(): Promise<{ team: TeamMember[]; gallery: GalleryImage[] }> {
  if (!isSupabaseConfigured) return { team: [], gallery: [] };
  const supabase = await createClient();
  const [team, gallery] = await Promise.all([
    supabase.from("team_members").select("*").order("sort_order").order("created_at"),
    supabase.from("gallery_images").select("*").order("sort_order").order("created_at"),
  ]);
  if (team.error) console.error("team_members", team.error.message);
  if (gallery.error) console.error("gallery_images", gallery.error.message);
  return { team: team.data ?? [], gallery: gallery.data ?? [] };
}
