"use server";

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DELETE_CONFIRM_WORD, isDeleteConfirmation, LEGAL_CONTACT_EMAIL } from "@/lib/legal";
import { createAdminClient, removeUserFiles } from "@/lib/supabase/admin";
import { MEDIA_BUCKET } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";


/** Self-service account deletion (Google Play requirement): auth account, cascading profile data and uploaded files. */
export async function deleteOwnAccount(confirmation: string): Promise<{ error: string }> {
  const me = await getSessionUser();
  if (!me) return { error: "Sesiunea a expirat. Autentifică-te din nou." };
  if (!isDeleteConfirmation(confirmation)) return { error: `Scrie ${DELETE_CONFIRM_WORD} pentru a confirma.` };
  if (me.role === "superadmin") return { error: "Contul Super Admin nu poate fi șters din aplicație. Transferă rolul altui cont mai întâi." };

  const admin = createAdminClient();
  if (!admin) return { error: `Ștergerea nu este disponibilă momentan. Scrie-ne la ${LEGAL_CONTACT_EMAIL} și îți ștergem contul.` };

  await removeUserFiles(admin, me.id, [MEDIA_BUCKET, "avatars"]);
  const { error } = await admin.auth.admin.deleteUser(me.id);
  if (error) {
    console.error("deleteOwnAccount", error.message);
    return { error: `Contul nu a putut fi șters. Încearcă din nou sau scrie-ne la ${LEGAL_CONTACT_EMAIL}.` };
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
