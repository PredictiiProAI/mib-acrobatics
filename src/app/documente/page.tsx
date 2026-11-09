import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { homeFor, needsWaiver, safeNext } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { RulesCard, WaiverCard } from "../profil/waiver-card";

export const metadata: Metadata = { title: "Documente obligatorii", robots: { index: false } };

/** Post-login gate: parents sign the parental consent & medical sheet, athletes accept the rules. Staff never see it. */
export default async function DocumentsGate({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await requireUser("/documente");
  const next = safeNext((await searchParams).next) ?? homeFor(user.role);
  if (!needsWaiver(user.role)) redirect(next);

  const supabase = await createClient();
  const [{ data: details }, { data: profile }, { data: settings }, { data: waivers }, { data: requested }] = await Promise.all([
    supabase.rpc("profile_details", { p_user: user.id }),
    supabase.from("users").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("user_settings").select("phone").eq("user_id", user.id).maybeSingle(),
    supabase.from("waiver_submissions").select("*").eq("user_id", user.id).order("signed_at", { ascending: false }),
    supabase.rpc("my_documents_request"),
  ]);
  const d = details?.[0];
  const parent = d?.account_type === "Părinte";
  if (d && (parent ? d.waiver_signed : d.rules_accepted_at)) redirect(next);

  return (
    <div className="mx-auto max-w-2xl space-y-6" data-testid="documents-gate">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-neon-green">Bun venit la AcroMIB</p>
        <h1 className="mt-1 font-display text-3xl font-black text-white">{parent ? "Încă un pas: acordul parental" : "Încă un pas: regulamentul"}</h1>
        <p className="mt-2 text-sm text-white/60">
          {parent
            ? "Pentru siguranța copilului tău, completează acordul parental și fișa medicală. Durează aproximativ 2 minute."
            : "Citește regulile de siguranță din sală și confirmă că le respecți."}
        </p>
      </header>
      {requested && (
        <p className="rounded-2xl border border-neon-orange/40 bg-neon-orange/10 p-4 text-sm font-semibold text-neon-orange" data-testid="documents-requested">
          Antrenorii ți-au cerut să completezi {parent ? "acordul parental și fișa medicală" : "regulamentul"}. Aplicația se deschide după ce termini.
        </p>
      )}
      {parent ? (
        <WaiverCard
          submissions={waivers ?? []}
          parent={{ name: profile?.full_name || user.fullName || "", email: user.email, phone: settings?.phone ?? "" }}
          autoOpen
        />
      ) : (
        <RulesCard acceptedAt={d?.rules_accepted_at ?? null} />
      )}
      {!requested && (
      <p className="text-center text-xs text-white/40">
        Poți face asta și mai târziu, din{" "}
        <Link href={next} className="font-semibold text-white/60 underline-offset-2 hover:text-neon-orange hover:underline" data-testid="documents-later">
          AcroMib
        </Link>{" "}
        → Profil.
      </p>
      )}
    </div>
  );
}
