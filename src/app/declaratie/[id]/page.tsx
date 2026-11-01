import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { FORM_ROLE_LABEL, MEDICAL_FIELDS, WAIVER_ACKS, WAIVER_INTRO, WAIVER_TITLE } from "@/lib/waiver";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Declarație & Fișă medicală", robots: { index: false } };

const fmt = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Bucharest" });
const day = (iso: string) => iso.split("-").reverse().join(".");

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-white/10 py-2 sm:grid-cols-[200px_1fr] sm:gap-4 print:grid-cols-[200px_1fr] print:gap-4 print:border-black/20">
      <dt className="text-xs font-semibold uppercase tracking-wider text-white/50 print:text-black/60">{label}</dt>
      <dd className="whitespace-pre-line break-words">{children}</dd>
    </div>
  );
}

/** Printable copy of one signed waiver; RLS limits it to the owner and staff. */
export default async function WaiverDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser(`/declaratie/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: w } = await supabase.from("waiver_submissions").select("*").eq("id", id).maybeSingle();
  if (!w) notFound();
  const { data: member } = await supabase.from("users").select("full_name, display_name").eq("id", w.user_id).maybeSingle();
  const ackLabels = WAIVER_ACKS[w.form_type].filter((a) => w.acknowledgements.includes(a.key));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 text-[15px] text-white/90 print:max-w-none print:p-0 print:text-[12px] print:text-black">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <BackButton fallback={isStaff(me.role) ? "/dashboard/users" : "/profil"} />
        <PrintButton />
      </div>

      <article className="rounded-3xl border border-neon-orange/40 bg-carbon/80 p-5 sm:p-8 print:rounded-none print:border-0 print:bg-white print:p-0" data-testid="waiver-document">
        <header className="border-b border-neon-orange/40 pb-4 print:border-black">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-neon-green print:text-black">MIB Acrobatics · AcroMIB</p>
          <h1 className="mt-1 font-display text-2xl font-black text-white print:text-black">{WAIVER_TITLE}</h1>
          <p className="mt-1 text-sm text-white/60 print:text-black/70">
            {w.form_type === "parinte" ? "Acord parental și fișa medicală a sportivului minor" : "Declarație sportiv major"} · Nr. document {w.id.slice(0, 8).toUpperCase()}
          </p>
        </header>

        <section className="mt-5 space-y-2 leading-relaxed text-white/80 print:text-black">
          {WAIVER_INTRO[w.form_type].map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        <h2 className="mt-6 font-display text-lg font-bold text-neon-orange print:text-black">Date</h2>
        <dl className="mt-2">
          <Row label="Cont">
            {member?.full_name || member?.display_name || "—"} · {FORM_ROLE_LABEL[w.form_type]}
          </Row>
          {w.form_type === "parinte" && (
            <>
              <Row label="Copil">{w.child_name}</Row>
              <Row label="Data nașterii copilului">{w.child_birthdate ? day(w.child_birthdate) : "—"}</Row>
            </>
          )}
          <Row label="Telefon urgență">{w.emergency_phone}</Row>
          <Row label="Contact secundar">{w.emergency_secondary || "—"}</Row>
        </dl>

        <h2 className="mt-6 font-display text-lg font-bold text-neon-orange print:text-black">Fișă medicală</h2>
        <dl className="mt-2">
          {MEDICAL_FIELDS.map((f) => (
            <Row key={f.key} label={f.label}>
              {w[f.key]}
            </Row>
          ))}
        </dl>

        <h2 className="mt-6 font-display text-lg font-bold text-neon-orange print:text-black">Declarații acceptate</h2>
        <ul className="mt-2 space-y-2">
          {ackLabels.map((a) => (
            <li key={a.key} className="flex gap-2 leading-relaxed">
              <span className="font-bold text-neon-green print:text-black">☑</span>
              <span>{a.label}</span>
            </li>
          ))}
        </ul>

        <section className="mt-8 rounded-2xl border border-neon-green/40 p-4 print:break-inside-avoid print:rounded-none print:border-black">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50 print:text-black/60">Semnătură digitală</p>
          <p className="mt-1 font-display text-xl font-bold text-white print:text-black">{w.signer_name}</p>
          <p className="mt-1 text-sm text-white/70 print:text-black/80">Semnat electronic în platforma AcroMIB pe {fmt.format(new Date(w.signed_at))} (ora României).</p>
        </section>
      </article>
    </main>
  );
}
