"use server";

import { revalidatePath } from "next/cache";
import { aboutPathFromUrl, DEFAULT_TEAM_ROLE } from "@/lib/about";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import { ABOUT_BUCKET, SUPABASE_URL } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./posts";

const DENIED: ActionResult = { ok: false, error: "Doar administratorii pot edita pagina Despre Noi." };

async function adminClient() {
  const me = await getSessionUser();
  return me && isStaff(me.role) ? createClient() : null;
}

function revalidateAbout() {
  revalidatePath("/despre");
  revalidatePath("/dashboard/about");
}

/** Only accept files that were uploaded to our own about_media bucket. */
function publicUrlFor(path: string) {
  if (!path || path.includes("..") || path.startsWith("/")) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${ABOUT_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function nextSortOrder(supabase: Awaited<ReturnType<typeof createClient>>, table: "team_members" | "gallery_images") {
  const { data } = await supabase.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1);
  return (data?.[0]?.sort_order ?? -1) + 1;
}

async function removeFile(supabase: Awaited<ReturnType<typeof createClient>>, url: string | null) {
  const path = aboutPathFromUrl(url);
  if (path) {
    const { error } = await supabase.storage.from(ABOUT_BUCKET).remove([path]);
    if (error) console.error("about_media remove", error.message);
  }
}

export async function addTeamMember(input: { name: string; role: string; imagePath: string | null }): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  const name = input.name.trim().slice(0, 80);
  const role = (input.role.trim() || DEFAULT_TEAM_ROLE).slice(0, 80);
  if (!name) return { ok: false, error: "Completează numele antrenorului." };
  const image_url = input.imagePath ? publicUrlFor(input.imagePath) : null;
  if (input.imagePath && !image_url) return { ok: false, error: "Fotografia nu este validă." };

  const { error } = await supabase.from("team_members").insert({ name, role, image_url, sort_order: await nextSortOrder(supabase, "team_members") });
  if (error) {
    console.error("addTeamMember", error.message);
    if (image_url) await removeFile(supabase, image_url);
    return { ok: false, error: "Membrul echipei nu a putut fi salvat." };
  }
  revalidateAbout();
  return { ok: true };
}

export async function updateTeamMember(id: string, input: { name: string; role: string }): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  const name = input.name.trim().slice(0, 80);
  const role = (input.role.trim() || DEFAULT_TEAM_ROLE).slice(0, 80);
  if (!name) return { ok: false, error: "Completează numele antrenorului." };
  const { data, error } = await supabase.from("team_members").update({ name, role }).eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, error: "Modificarea nu a putut fi salvată." };
  revalidateAbout();
  return { ok: true };
}

export async function deleteTeamMember(id: string): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  const { data, error } = await supabase.from("team_members").delete().eq("id", id).select("image_url");
  if (error || !data?.length) return { ok: false, error: "Membrul echipei nu a putut fi șters." };
  await removeFile(supabase, data[0].image_url);
  revalidateAbout();
  return { ok: true };
}

export async function moveItem(table: "team_members" | "gallery_images", id: string, direction: -1 | 1): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  if (table !== "team_members" && table !== "gallery_images") return { ok: false, error: "Secțiune invalidă." };
  const { data } = await supabase.from(table).select("id, sort_order").order("sort_order").order("created_at");
  const rows = data ?? [];
  const i = rows.findIndex((r) => r.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= rows.length) return { ok: true };
  [rows[i], rows[j]] = [rows[j], rows[i]];
  // Renumber everything so equal sort_order values can't make the order ambiguous.
  const results = await Promise.all(rows.map((r, index) => (r.sort_order === index ? null : supabase.from(table).update({ sort_order: index }).eq("id", r.id))));
  if (results.some((r) => r?.error)) return { ok: false, error: "Ordinea nu a putut fi salvată." };
  revalidateAbout();
  return { ok: true };
}

export async function addGalleryImages(paths: string[]): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  const urls = paths.map(publicUrlFor);
  if (!urls.length || urls.some((u) => !u)) return { ok: false, error: "Fotografiile nu sunt valide." };
  const start = await nextSortOrder(supabase, "gallery_images");
  const { error } = await supabase.from("gallery_images").insert(urls.map((image_url, i) => ({ image_url: image_url!, sort_order: start + i })));
  if (error) {
    console.error("addGalleryImages", error.message);
    return { ok: false, error: "Fotografiile nu au putut fi salvate." };
  }
  revalidateAbout();
  return { ok: true };
}

export async function deleteGalleryImage(id: string): Promise<ActionResult> {
  const supabase = await adminClient();
  if (!supabase) return DENIED;
  const { data, error } = await supabase.from("gallery_images").delete().eq("id", id).select("image_url");
  if (error || !data?.length) return { ok: false, error: "Fotografia nu a putut fi ștearsă." };
  await removeFile(supabase, data[0].image_url);
  revalidateAbout();
  return { ok: true };
}
