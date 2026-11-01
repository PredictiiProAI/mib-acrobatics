"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser, publicName } from "@/lib/auth";
import { needsWaiver } from "@/lib/roles";
import { sendWaiverAlert } from "@/lib/signup-alert";
import { createClient } from "@/lib/supabase/server";
import { MEDICAL_FIELDS, WAIVER_ACKS, type MedicalKey, type WaiverAck } from "@/lib/waiver";

export type WaiverInput = {
  signerName: string;
  childName: string;
  childBirthdate: string;
  emergencyPhone: string;
  emergencySecondary: string;
  medical: Record<MedicalKey, string>;
  acks: WaiverAck[];
  /** Id of the medical sheet being edited; the edit is stored as a new version. */
  replaces?: string;
};
export type WaiverResult = { ok: true; id: string; signedAt: string } | { ok: false; error: string };
export type RulesResult = { ok: true; acceptedAt: string } | { ok: false; error: string };

const PHONE = /^\+?[0-9 ()./-]{6,20}$/;
const UUID = /^[0-9a-f-]{36}$/i;
const clean = (v: string, max: number) => v.trim().replace(/\s+/g, " ").slice(0, max);
const MIGRATION = "Rulează migrarea 0017_parent_consent_rules.sql în Supabase.";

const DB_ERRORS: [string, string][] = [
  ["invalid_name", "Scrie numele și prenumele complet pentru semnătură."],
  ["invalid_phone", "Numărul de telefon de urgență nu este valid."],
  ["invalid_child", "Completează numele complet și data nașterii copilului."],
  ["invalid_medical", "Completează toate întrebările medicale (sau „Nu este cazul”)."],
  ["missing_ack", "Bifează toate declarațiile."],
  ["parent_only", "Acordul parental și fișa medicală se completează doar dintr-un cont de tip Părinte."],
  ["invalid_replaces", "Fișa pe care o editezi nu mai există. Reîncarcă pagina."],
];
const message = (code: string) => DB_ERRORS.find(([c]) => c === code)![1];

export async function submitWaiver(input: WaiverInput): Promise<WaiverResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "Trebuie să fii autentificat." };
  if (!needsWaiver(me.role)) return { ok: false, error: "Conturile de staff sunt scutite de declarație." };

  const supabase = await createClient();
  const { data: details } = await supabase.rpc("profile_details", { p_user: me.id });
  if (details?.[0]?.account_type !== "Părinte") return { ok: false, error: message("parent_only") };

  const signerName = clean(input.signerName, 120);
  const childName = clean(input.childName, 120);
  const childBirthdate = input.childBirthdate;
  const emergencyPhone = input.emergencyPhone.trim();
  const emergencySecondary = clean(input.emergencySecondary, 200);
  const medical = Object.fromEntries(MEDICAL_FIELDS.map((f) => [f.key, (input.medical[f.key] ?? "").trim().slice(0, 1000)])) as Record<MedicalKey, string>;
  const replaces = input.replaces && UUID.test(input.replaces) ? input.replaces : null;

  if (signerName.length < 3 || !signerName.includes(" ")) return { ok: false, error: message("invalid_name") };
  if (childName.length < 3 || !/^\d{4}-\d{2}-\d{2}$/.test(childBirthdate)) return { ok: false, error: message("invalid_child") };
  if (!PHONE.test(emergencyPhone)) return { ok: false, error: message("invalid_phone") };
  if (MEDICAL_FIELDS.some((f) => !medical[f.key])) return { ok: false, error: message("invalid_medical") };
  if (WAIVER_ACKS.parinte.some((a) => !input.acks.includes(a.key))) return { ok: false, error: message("missing_ack") };

  const { data, error } = await supabase.rpc("submit_waiver", {
    p: {
      signer_name: signerName,
      child_name: childName,
      child_birthdate: childBirthdate,
      emergency_phone: emergencyPhone,
      emergency_secondary: emergencySecondary,
      ...medical,
      acknowledgements: input.acks,
      replaces,
    },
  });
  if (error || !data?.id) {
    console.error("submit_waiver", error?.message);
    if (error?.code === "PGRST202" || error?.code === "42883" || (!error && !data?.id)) return { ok: false, error: MIGRATION };
    const known = DB_ERRORS.find(([code]) => error?.message.includes(code));
    return { ok: false, error: known?.[1] ?? "Nu am putut salva fișa. Încearcă din nou." };
  }

  after(() =>
    sendWaiverAlert({
      id: data.id,
      edited: !!replaces,
      userName: me.fullName || publicName(me),
      email: me.email,
      signerName,
      childName,
      childBirthdate,
      emergencyPhone,
      emergencySecondary,
      medical,
      signedAt: data.signed_at,
    }),
  );
  revalidatePath("/profil");
  revalidatePath("/dashboard/users");
  return { ok: true, id: data.id, signedAt: data.signed_at };
}

export async function acceptRules(): Promise<RulesResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "Trebuie să fii autentificat." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_rules");
  if (error || !data) {
    console.error("accept_rules", error?.message);
    if (error?.code === "PGRST202" || error?.code === "42883") return { ok: false, error: MIGRATION };
    if (error?.message.includes("athlete_only")) return { ok: false, error: "Regulamentul se acceptă din contul sportivului." };
    return { ok: false, error: "Nu am putut salva acceptarea. Încearcă din nou." };
  }
  revalidatePath("/profil");
  revalidatePath("/dashboard/users");
  return { ok: true, acceptedAt: data };
}
