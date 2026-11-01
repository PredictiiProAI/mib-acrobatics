import type { Database } from "./supabase/database.types";
import { ABOUT_BUCKET } from "./supabase/env";

export type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];
export type GalleryImage = Database["public"]["Tables"]["gallery_images"]["Row"];

export const DEFAULT_TEAM_ROLE = "Antrenor Colaborator";

/** Must match storage.buckets.allowed_mime_types / file_size_limit for about_media (0008_about.sql). */
export const ABOUT_MAX_BYTES = 10 * 1024 * 1024;
export const ABOUT_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Object path inside about_media for one of its public URLs (null for anything else). */
export function aboutPathFromUrl(url: string | null | undefined) {
  const marker = `/storage/v1/object/public/${ABOUT_BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  return url && i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}
