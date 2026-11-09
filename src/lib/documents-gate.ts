import "server-only";
import { redirect } from "next/navigation";
import type { SessionUser } from "./auth";
import { needsWaiver } from "./roles";
import { createClient } from "./supabase/server";

/** Staff asked for this member's missing document (0022) and it is still missing. */
export async function documentsRequested(userId: string) {
  const supabase = await createClient();
  const { data: requested, error } = await supabase.rpc("my_documents_request");
  if (error || !requested) return false;
  const { data } = await supabase.rpc("profile_details", { p_user: userId });
  const d = data?.[0];
  return !!d && !(d.account_type === "Părinte" ? d.waiver_signed : d.rules_accepted_at);
}

/** Sends the member to /documente (without "later") while a staff request is open. */
export async function enforceRequestedDocuments(user: SessionUser, next: string) {
  if (needsWaiver(user.role) && (await documentsRequested(user.id))) redirect(`/documente?next=${encodeURIComponent(next)}`);
}
