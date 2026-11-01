import { createHash } from "node:crypto";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { FORM_ROLE_LABEL, MEDICAL_FIELDS, NOT_APPLICABLE, WAIVER_ACKS, WAIVER_INTRO, WAIVER_TITLE } from "@/lib/waiver";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Acord Parental & Fișă Medicală Sportiv", robots: { index: false } };

type Submission = Database["public"]["Tables"]["waiver_submissions"]["Row"];

const fmt = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Bucharest" });
const shortFmt = new Intl.DateTimeFormat("ro-RO", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Bucharest" });
const day = (iso: string) => iso.split("-").reverse().join(".");

/** SHA-256 over the signed content, so any later change to the record is detectable. */
function fingerprint(w: Submission) {
  const { id, user_id, form_type, signer_name, child_name, child_birthdate, emergency_phone, emergency_secondary, acknowledgements, signed_at } = w;
  const medical = MEDICAL_FIELDS.map((f) => w[f.key]);
  return createHash("sha256")
    .update(JSON.stringify([id, user_id, form_type, signer_name, child_name, child_birthdate, emergency_phone, emergency_secondary, medical, acknowledgements, signed_at]))
    .digest("hex");
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 font-display text-[15px] font-bold uppercase tracking-wide text-[#111827]">
      <span className="flex size-6 items-center justify-center rounded-full bg-[#ff6a00] text-xs font-black text-white">{n}</span>
      {children}
    </h2>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`border-[#e5e7eb] px-4 py-3 ${wide ? "sm:col-span-2 print:col-span-2" : ""}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">{label}</dt>
      <dd className="mt-0.5 break-words font-semibold text-[#111827]">{value}</dd>
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
  const [{ data: member }, { data: newer }] = await Promise.all([
    supabase.from("users").select("full_name, display_name").eq("id", w.user_id).maybeSingle(),
    supabase.from("waiver_submissions").select("id").eq("replaces", w.id).order("signed_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const parent = w.form_type === "parinte";
  const docNo = w.id.slice(0, 8).toUpperCase();
  const hash = fingerprint(w);
  const memberName = member?.full_name || member?.display_name || w.signer_name;
  const acks = WAIVER_ACKS[w.form_type].filter((a) => w.acknowledgements.includes(a.key));
  const identity: [string, string][] = [
    [parent ? "Cont părinte" : "Sportiv", memberName],
    ...(parent
      ? ([
          ["Nume copil", w.child_name ?? "—"],
          ["Data nașterii copilului", w.child_birthdate ? day(w.child_birthdate) : "—"],
        ] as [string, string][])
      : []),
    ["Telefon urgență", w.emergency_phone],
    ["Contact secundar", w.emergency_secondary || "—"],
  ];

  return (
    <main className="mx-auto w-full max-w-[860px] flex-1 px-3 py-6 sm:px-6 print:max-w-none print:p-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <BackButton fallback={isStaff(me.role) ? "/dashboard/users" : "/profil"} />
        <PrintButton />
      </div>

      <article
        className="overflow-hidden rounded-2xl bg-white text-[14px] leading-relaxed text-[#111827] shadow-2xl print:rounded-none print:text-[11.5px] print:shadow-none"
        data-testid="waiver-document"
      >
        <div className="h-1.5 bg-gradient-to-r from-[#ff6a00] via-[#ff6a00] to-[#39ff14]" />
        <div className="space-y-7 p-5 sm:p-9 print:space-y-5 print:px-0 print:py-4">
          <header className="flex flex-col gap-5 border-b border-[#e5e7eb] pb-6 sm:flex-row sm:items-center print:flex-row print:items-center print:pb-4">
            <Image src="/mib-logo.png" alt="MIB Acrobatics" width={72} height={72} className="size-[72px] shrink-0 rounded-xl" priority />
            <div className="flex-1">
              <p className="font-display text-sm font-black tracking-[0.3em] text-[#ff6a00]">MIB ACROBATICS</p>
              <h1 className="mt-1 font-display text-xl font-black leading-tight text-[#111827] sm:text-2xl">{WAIVER_TITLE}</h1>
              <p className="mt-1 text-[13px] text-[#4b5563]">Acord parental și fișa medicală a sportivului</p>
            </div>
            <dl className="shrink-0 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-[12px]" data-testid="waiver-doc-meta">
              <div className="flex justify-between gap-4">
                <dt className="text-[#6b7280]">Nr. document</dt>
                <dd className="font-mono font-bold text-[#111827]">{docNo}</dd>
              </div>
              <div className="mt-1 flex justify-between gap-4">
                <dt className="text-[#6b7280]">Generat</dt>
                <dd className="font-semibold text-[#111827]">{shortFmt.format(new Date())}</dd>
              </div>
              {w.replaces && (
                <div className="mt-1 flex justify-between gap-4">
                  <dt className="text-[#6b7280]">Înlocuiește</dt>
                  <dd className="font-mono font-bold text-[#111827]">{w.replaces.slice(0, 8).toUpperCase()}</dd>
                </div>
              )}
            </dl>
          </header>

          {newer && (
            <p className="rounded-xl border border-[#ff6a00]/50 bg-[#fff7ed] px-4 py-3 text-[13px] font-semibold text-[#9a3412]" data-testid="waiver-doc-superseded">
              Versiune anterioară: părintele a actualizat fișa medicală.{" "}
              <a href={`/declaratie/${newer.id}`} className="underline print:no-underline">
                Vezi versiunea curentă ({newer.id.slice(0, 8).toUpperCase()})
              </a>
            </p>
          )}

          <section className="space-y-2 text-[#374151]">
            {WAIVER_INTRO[w.form_type].map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>

          <section className="space-y-3 print:break-inside-avoid">
            <SectionTitle n={1}>Date de identificare</SectionTitle>
            <dl className="grid overflow-hidden rounded-xl border border-[#e5e7eb] sm:grid-cols-2 print:grid-cols-2 [&>div]:border-b [&>div:nth-child(odd)]:sm:border-r [&>div:nth-child(odd)]:print:border-r">
              {identity.map(([k, v], i) => (
                <Field key={k} label={k} value={v} wide={identity.length % 2 === 1 && i === identity.length - 1} />
              ))}
            </dl>
          </section>

          <section className="space-y-3 print:break-inside-avoid">
            <SectionTitle n={2}>Fișă medicală & mențiuni speciale</SectionTitle>
            <div className="overflow-hidden rounded-xl border border-[#ff6a00]/50 bg-[#fff7ed]" data-testid="waiver-doc-medical">
              <p className="border-b border-[#ff6a00]/30 bg-[#ffedd5] px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-[#9a3412]">
                ⚠ Informații medicale confidențiale — de consultat înainte de antrenament
              </p>
              <dl className="divide-y divide-[#fed7aa]">
                {MEDICAL_FIELDS.map((f) => {
                  const na = w[f.key] === NOT_APPLICABLE;
                  return (
                    <div key={f.key} className="grid gap-1 px-4 py-3 sm:grid-cols-[220px_1fr] sm:gap-4 print:grid-cols-[220px_1fr] print:gap-4">
                      <dt className="text-[12px] font-bold text-[#7c2d12]">{f.label}</dt>
                      <dd className={`whitespace-pre-line break-words ${na ? "text-[#6b7280]" : "font-semibold text-[#111827]"}`}>{w[f.key]}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle n={3}>Declarații acceptate</SectionTitle>
            <ul className="space-y-3 rounded-xl border border-[#e5e7eb] p-4">
              {acks.map((a) => (
                <li key={a.key} className="flex items-start gap-3 print:break-inside-avoid">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#39ff14] text-[12px] font-black leading-none text-[#111827]" aria-hidden>
                    ✓
                  </span>
                  <span className="text-[#1f2937]">{a.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border-2 border-[#39ff14] bg-[#f7fff4] p-5 print:break-inside-avoid" data-testid="waiver-doc-signature">
            <p className="font-display text-[13px] font-black tracking-wider text-[#111827]">SEMNĂTURĂ DIGITALĂ ȘI CONSIMȚĂMÂNT ELECTRONIC</p>
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 print:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Semnatar</dt>
                <dd className="font-display text-lg font-bold text-[#111827]">{w.signer_name}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Rol verificat</dt>
                <dd className="font-semibold">{parent ? "Părinte / tutore legal" : "Sportiv"} · cont {FORM_ROLE_LABEL[w.form_type]}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Data și ora semnării</dt>
                <dd className="font-semibold">{fmt.format(new Date(w.signed_at))} (ora României)</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">ID document</dt>
                <dd className="break-all font-mono text-[12px]">{w.id}</dd>
              </div>
              <div className="sm:col-span-2 print:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Amprentă SHA-256</dt>
                <dd className="break-all font-mono text-[11px] text-[#374151]" data-testid="waiver-doc-hash">{hash}</dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-[#39ff14]/60 pt-3 text-[12px] text-[#4b5563]">
              Document semnat electronic în platforma AcroMIB de titularul contului autentificat. Data și ora sunt înregistrate de server; amprenta permite verificarea că datele nu au fost modificate după semnare.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
