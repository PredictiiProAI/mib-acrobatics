"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { mediaTypeFor } from "@/lib/media";
import { canPublish } from "@/lib/roles";
import { MEDIA_BUCKET } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateFeeds() {
  revalidatePath("/");
  revalidatePath("/feed");
  revalidatePath("/dashboard", "layout");
}

/** Creates the post row for a file the client already uploaded to `<uid>/...` in mib_media. */
export async function createPost(input: {
  storagePath: string;
  mime: string;
  caption: string;
  isPublic: boolean;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || !canPublish(user.role)) return { ok: false, error: "Nu ai dreptul să publici." };

  const mediaType = mediaTypeFor(input.mime);
  const path = input.storagePath;
  if (!mediaType) return { ok: false, error: "Tip de fișier neacceptat." };
  if (!path.startsWith(`${user.id}/`) || path.includes("..")) return { ok: false, error: "Cale de fișier invalidă." };

  const supabase = await createClient();
  const caption = input.caption.trim().slice(0, 2200) || null;
  const mediaUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    media_url: mediaUrl,
    media_type: mediaType,
    caption,
    storage_path: path,
    is_public: input.isPublic,
  });
  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    console.error("createPost", error.message);
    return { ok: false, error: "Postarea nu a putut fi salvată." };
  }
  revalidateFeeds();
  return { ok: true };
}

/** Authors delete their own posts; admin/superadmin can delete any post (enforced by RLS). */
export async function deletePost(postId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Trebuie să fii autentificat." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").delete().eq("id", postId).select("storage_path");
  if (error || !data?.length) return { ok: false, error: "Nu poți șterge această postare." };

  const path = data[0].storage_path;
  if (path) {
    const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    if (storageError) console.error("deletePost storage", storageError.message);
  }
  revalidateFeeds();
  return { ok: true };
}

export async function setPostVisibility(postId: string, isPublic: boolean): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || !canPublish(user.role)) return { ok: false, error: "Nu ai dreptul să modifici postarea." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").update({ is_public: isPublic }).eq("id", postId).select("id");
  if (error || !data?.length) return { ok: false, error: "Poți modifica doar postările tale." };
  revalidateFeeds();
  return { ok: true };
}

/** Comment authors delete their own comments; staff can delete any (enforced by RLS). */
export async function deleteComment(commentId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Trebuie să fii autentificat." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("comments").delete().eq("id", commentId).select("id");
  if (error || !data?.length) return { ok: false, error: "Nu poți șterge acest comentariu." };
  revalidatePath("/dashboard/comments");
  return { ok: true };
}
