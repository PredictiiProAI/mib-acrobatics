"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser, publicName } from "@/lib/auth";
import { sendWaiverAlert } from "@/lib/signup-alert";
import { createClient } from "@/lib/supabase/server";

export type WaiverResult = { ok: true; signedAt: string } | { ok: false; error: string };

export async function signWaiver(input: { name: string; agreed: boolean }): Promise<WaiverResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "Trebuie să fii autentificat." };
  if (input.agreed !== true) return { ok: false, error: "Bifează că ai citit și ești de acord cu termenii." };
  const name = input.name.trim().replace(/\s+/g, " ");
  if (name.length < 3 || name.length > 120 || !name.includes(" ")) return { ok: false, error: "Scrie numele și prenumele complet pentru semnătură." };

  const supabase = await createClient();
  const { data: signedAt, error } = await supabase.rpc("sign_waiver", { p_name: name });
  if (error || !signedAt) {
    console.error("sign_waiver", error?.message);
    if (error?.message.includes("already_signed")) return { ok: false, error: "Declarația este deja semnată." };
    if (error?.message.includes("invalid_name")) return { ok: false, error: "Scrie numele și prenumele complet pentru semnătură." };
    if (error?.code === "PGRST202" || error?.code === "42883") return { ok: false, error: "Rulează migrarea 0015_waiver.sql în Supabase." };
    return { ok: false, error: "Nu am putut salva semnătura. Încearcă din nou." };
  }

  const { data: details } = await supabase.rpc("profile_details", { p_user: me.id });
  const userName = me.fullName || publicName(me);
  after(() =>
    sendWaiverAlert({ userName, email: me.email, signedBy: name, signedAt, accountType: details?.[0]?.account_type ?? "Sportiv" })
  );
  revalidatePath("/profil");
  revalidatePath("/dashboard/users");
  return { ok: true, signedAt };
}
