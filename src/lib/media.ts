import type { MediaType } from "./supabase/database.types";

/** Must match storage.buckets.allowed_mime_types / file_size_limit for mib_media. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const ALLOWED_MIME: Record<string, MediaType> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "image/heic": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
};

export const ACCEPT_ATTR = Object.keys(ALLOWED_MIME).join(",");

export const mediaTypeFor = (mime: string): MediaType | null => ALLOWED_MIME[mime] ?? null;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export const extensionFor = (mime: string) => EXT[mime] ?? "bin";

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
