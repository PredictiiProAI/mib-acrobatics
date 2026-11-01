"use client";

import { AlertTriangle, CheckCircle2, FileSignature, Loader2, Pencil, Plus, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { acceptRules, submitWaiver } from "@/lib/actions/waiver";
import type { Database } from "@/lib/supabase/database.types";
import {
  MEDICAL_FIELDS,
  NOT_APPLICABLE,
  RULES,
  RULES_ACCEPT,
  RULES_TITLE,
  WAIVER_ACKS,
  WAIVER_INTRO,
  WAIVER_TITLE,
  type MedicalKey,
  type WaiverAck,
} from "@/lib/waiver";

export type WaiverSubmission = Database["public"]["Tables"]["waiver_submissions"]["Row"];

const fmt = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bucharest" });
const input =
  "mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-3 font-normal text-white outline-none placeholder:text-white/30 focus:border-neon-orange";

type Parent = { name: string; email: string; phone: string };
type Props = { submissions: WaiverSubmission[]; parent: Parent; autoOpen?: boolean };

/** Current version of each child's sheet: edits point at the version they replace. */
function current(submissions: WaiverSubmission[]) {
  const replaced = new Set(submissions.map((s) => s.replaces).filter(Boolean));
  const seen = new Set<string>();
  return submissions.filter((s) => {
    if (s.form_type !== "parinte" || replaced.has(s.id)) return false;
    const key = (s.child_name ?? "").toLocaleLowerCase("ro-RO");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function WaiverCard({ submissions, parent, autoOpen }: Props) {
  const latest = current(submissions);
  const [open, setOpen] = useState<WaiverSubmission | "new" | null>(autoOpen && !latest.length ? "new" : null);
  const signed = latest.length > 0;

  return (
    <section
      className={`rounded-3xl border bg-carbon/80 p-6 ${signed ? "border-neon-green/40" : "border-red-500/60"}`}
      data-testid="waiver-card"
      data-signed={signed}
    >
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
        <FileSignature className="size-5 text-neon-orange" /> {WAIVER_TITLE}
      </h2>
      <p className="mt-1 text-sm text-white/60">Acordul parental și fișa medicală a copilului, pe care o poți edita oricând.</p>

      {signed ? (
        <ul className="mt-4 space-y-3">
          {latest.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 rounded-2xl border border-neon-green/40 bg-neon-green/10 p-4 sm:flex-row sm:items-center" data-testid="waiver-signed">
              <CheckCircle2 className="size-5 shrink-0 text-neon-green" />
              <div className="flex-1 text-sm">
                <p className="font-bold text-neon-green">Fișă medicală: {s.child_name}</p>
                <p className="mt-1 text-white/70">
                  {s.replaces ? "Actualizată" : "Semnată"} de <span className="font-semibold text-white">{s.signer_name}</span> pe {fmt.format(new Date(s.signed_at))}.
                </p>
                <Link href={`/declaratie/${s.id}`} className="mt-1 inline-block text-xs font-bold text-neon-orange hover:text-neon-green" data-testid="waiver-document-link">
                  Vezi / descarcă PDF
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setOpen(s)}
                className="inline-flex items-center gap-1.5 self-start rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-white/80 hover:border-neon-orange hover:text-neon-orange sm:self-center"
                data-testid="waiver-edit"
              >
                <Pencil className="size-3.5" /> Editează Fișa Medicală
              </button>
            </li>
          ))}
          <button
            type="button"
            onClick={() => setOpen("new")}
            className="inline-flex items-center gap-2 rounded-2xl border border-neon-orange/50 px-4 py-2.5 text-sm font-bold text-neon-orange hover:bg-neon-orange/10"
            data-testid="waiver-add-child"
          >
            <Plus className="size-4" /> Adaugă fișă pentru alt copil
          </button>
        </ul>
      ) : (
        <>
          <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/60 bg-red-500/10 p-4" data-testid="waiver-warning">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-400" />
            <p className="text-sm font-semibold text-red-300">
              Acțiune necesară: Copilul tău nu poate participa la antrenamente până nu semnezi acordul parental și nu completezi fișa medicală.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen("new")}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-neon-orange px-5 py-3 text-sm font-bold text-black transition hover:bg-neon-green"
            data-testid="waiver-open"
          >
            <FileSignature className="size-4" /> Completează Acordul Parental
          </button>
        </>
      )}

      {open && <WaiverModal edit={open === "new" ? undefined : open} parent={parent} onClose={() => setOpen(null)} />}
    </section>
  );
}

const rulesFmt = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bucharest" });

/** Athletes (mostly minors) only acknowledge the gym rules; the legal consent is signed by the parent. */
export function RulesCard({ acceptedAt: initial }: { acceptedAt: string | null }) {
  const router = useRouter();
  const [acceptedAt, setAcceptedAt] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const accept = () =>
    start(async () => {
      setError(null);
      const res = await acceptRules();
      if (!res.ok) return setError(res.error);
      setAcceptedAt(res.acceptedAt);
      router.refresh();
    });

  return (
    <section
      className={`rounded-3xl border bg-carbon/80 p-6 ${acceptedAt ? "border-neon-green/40" : "border-neon-orange/60"}`}
      data-testid="rules-card"
      data-accepted={!!acceptedAt}
    >
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
        <ShieldCheck className="size-5 text-neon-orange" /> {RULES_TITLE}
      </h2>
      <p className="mt-1 text-sm text-white/60">Regulile de siguranță din sală, pe care le respectăm toți.</p>
      <ul className="mt-4 space-y-3">
        {RULES.map((r) => (
          <li key={r} className="flex items-start gap-3 text-sm leading-relaxed text-white/85">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-neon-green text-[11px] font-black text-black" aria-hidden>
              ✓
            </span>
            {r}
          </li>
        ))}
      </ul>
      {acceptedAt ? (
        <p className="mt-5 flex items-center gap-2 rounded-2xl border border-neon-green/40 bg-neon-green/10 p-4 text-sm font-semibold text-neon-green" data-testid="rules-accepted">
          <CheckCircle2 className="size-5 shrink-0" /> Ai acceptat regulamentul pe {rulesFmt.format(new Date(acceptedAt))}.
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={accept}
            disabled={pending}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-neon-orange px-5 py-3.5 text-sm font-black text-black transition hover:bg-neon-green disabled:opacity-60 sm:w-auto"
            data-testid="rules-accept"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} {RULES_ACCEPT}
          </button>
          {error && (
            <p role="alert" className="mt-3 text-sm font-semibold text-red-400">
              {error}
            </p>
          )}
        </>
      )}
      <p className="mt-4 text-xs text-white/45">Acordul parental și fișa medicală le completează părintele, din contul lui de tip Părinte.</p>
    </section>
  );
}

function WaiverModal({ edit, parent, onClose }: { edit?: WaiverSubmission; parent: Parent; onClose: () => void }) {
  const prefill = edit;
  const router = useRouter();
  const [signerName, setSignerName] = useState(prefill?.signer_name ?? parent.name);
  const [childName, setChildName] = useState(prefill?.child_name ?? "");
  const [childBirthdate, setChildBirthdate] = useState(prefill?.child_birthdate ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(prefill?.emergency_phone ?? parent.phone);
  const [emergencySecondary, setEmergencySecondary] = useState(prefill?.emergency_secondary ?? "");
  const [medical, setMedical] = useState<Record<MedicalKey, string>>(() =>
    Object.fromEntries(MEDICAL_FIELDS.map((f) => [f.key, prefill?.[f.key] ?? ""])) as Record<MedicalKey, string>,
  );
  const [acks, setAcks] = useState<WaiverAck[]>(() => (edit ? WAIVER_ACKS.parinte.map((a) => a.key).filter((k) => edit.acknowledgements.includes(k)) : []));
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [pending, start] = useTransition();
  const ackList = WAIVER_ACKS.parinte;
  const complete =
    signerName.trim().includes(" ") &&
    emergencyPhone.trim().length >= 6 &&
    MEDICAL_FIELDS.every((f) => medical[f.key].trim()) &&
    ackList.every((a) => acks.includes(a.key)) &&
    childName.trim().length >= 3 &&
    !!childBirthdate;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, pending]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitWaiver({ signerName, childName, childBirthdate, emergencyPhone, emergencySecondary, medical, acks, replaces: edit?.id });
      if (!res.ok) return setError(res.error);
      onClose();
      router.refresh();
    });
  };

  const toggleAck = (key: WaiverAck) => setAcks((a) => (a.includes(key) ? a.filter((k) => k !== key) : [...a, key]));
  const today = new Date().toISOString().slice(0, 10);

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:p-4 ${shown ? "opacity-100" : "opacity-0"}`}
      onClick={() => !pending && onClose()}
      data-testid="waiver-modal"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="waiver-title"
        className={`flex max-h-[95dvh] w-full max-w-2xl flex-col rounded-t-3xl border border-neon-orange/40 bg-carbon shadow-2xl transition-transform duration-200 sm:rounded-3xl ${shown ? "translate-y-0" : "translate-y-6"}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-neon-green">{edit ? "Editează Fișa Medicală" : "Acord parental"}</p>
            <h2 id="waiver-title" className="mt-1 font-display text-xl font-black text-white">
              {WAIVER_TITLE}
            </h2>
          </div>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Închide" className="rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5 text-sm sm:p-6" data-testid="waiver-text">
          <div className="space-y-2 leading-relaxed text-white/75">
            {WAIVER_INTRO.parinte.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <dl className="grid gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 sm:grid-cols-2" data-testid="waiver-parent">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neon-green sm:col-span-2">Date părinte (din profil)</p>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-white/45">Nume</dt>
              <dd className="font-semibold text-white">{parent.name || "—"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] uppercase tracking-wider text-white/45">Email</dt>
              <dd className="truncate font-semibold text-white">{parent.email}</dd>
            </div>
            {parent.phone && (
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-white/45">Telefon</dt>
                <dd className="font-semibold text-white">{parent.phone}</dd>
              </div>
            )}
          </dl>

            <fieldset className="space-y-3">
              <legend className="font-display text-base font-bold text-neon-orange">Datele copilului</legend>
              <label className="block font-semibold text-white/80">
                Numele complet al copilului
                <input value={childName} onChange={(e) => setChildName(e.target.value)} required minLength={3} maxLength={120} className={input} placeholder="ex. Popescu Andrei" data-testid="waiver-child-name" />
              </label>
              <label className="block font-semibold text-white/80">
                Data nașterii copilului
                <input type="date" value={childBirthdate} onChange={(e) => setChildBirthdate(e.target.value)} required min="1990-01-01" max={today} className={input} data-testid="waiver-child-birthdate" />
              </label>
            </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-display text-base font-bold text-neon-orange">Contact de urgență</legend>
            <label className="block font-semibold text-white/80">
              Telefon principal de urgență
              <input type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} required inputMode="tel" maxLength={20} className={input} placeholder="ex. 0722 123 456" data-testid="waiver-phone" />
            </label>
            <label className="block font-semibold text-white/80">
              Contact secundar (opțional)
              <input value={emergencySecondary} onChange={(e) => setEmergencySecondary(e.target.value)} maxLength={200} className={input} placeholder="Nume și telefon" data-testid="waiver-secondary" />
            </label>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="font-display text-base font-bold text-neon-orange">Fișă medicală</legend>
            {MEDICAL_FIELDS.map((f) => {
              const na = medical[f.key] === NOT_APPLICABLE;
              return (
                <div key={f.key}>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor={`med-${f.key}`} className="font-semibold text-white/80">
                      {f.label}
                    </label>
                    <button
                      type="button"
                      onClick={() => setMedical((m) => ({ ...m, [f.key]: na ? "" : NOT_APPLICABLE }))}
                      aria-pressed={na}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1 transition ${na ? "bg-neon-green/15 text-neon-green ring-neon-green/50" : "text-white/60 ring-white/15 hover:text-white"}`}
                      data-testid={`waiver-na-${f.key}`}
                    >
                      {NOT_APPLICABLE}
                    </button>
                  </div>
                  <textarea
                    id={`med-${f.key}`}
                    value={medical[f.key]}
                    onChange={(e) => setMedical((m) => ({ ...m, [f.key]: e.target.value }))}
                    required
                    maxLength={1000}
                    rows={2}
                    placeholder={f.hint}
                    className={`${input} resize-y`}
                    data-testid={`waiver-med-${f.key}`}
                  />
                </div>
              );
            })}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-display text-base font-bold text-neon-orange">Declarații</legend>
            {ackList.map((a) => (
              <label key={a.key} className="flex cursor-pointer items-start gap-3 leading-relaxed text-white/80">
                <input
                  type="checkbox"
                  checked={acks.includes(a.key)}
                  onChange={() => toggleAck(a.key)}
                  required
                  className="mt-0.5 size-5 shrink-0 accent-[#ff6a00]"
                  data-testid={`waiver-ack-${a.key}`}
                />
                {a.label}
              </label>
            ))}
            <p className="text-xs text-white/50">
              Detalii despre prelucrarea datelor în{" "}
              <Link href="/confidentialitate" target="_blank" className="font-semibold text-neon-orange hover:text-neon-green">
                Politica de Confidențialitate
              </Link>
              .
            </p>
          </fieldset>

          <label className="block font-semibold text-white/80">
            Numele și Prenumele părintelui / tutorelui (semnătură digitală)
            <input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              required
              minLength={3}
              maxLength={120}
              autoComplete="name"
              placeholder="ex. Popescu Maria"
              className={input}
              data-testid="waiver-name"
            />
          </label>
        </div>

        <div className="border-t border-white/10 p-5 sm:p-6">
          {error && (
            <p role="alert" className="mb-3 text-sm font-semibold text-red-400" data-testid="waiver-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending || !complete}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff6a00] px-5 py-3.5 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="waiver-submit"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <FileSignature className="size-4" />} {edit ? "Salvează și Semnează din nou" : "Trimite și Semnează"}
          </button>
          <p className="mt-2 text-center text-xs text-white/45">{edit ? "Se creează o versiune nouă a PDF-ului; cea veche rămâne în istoric." : "Data și ora semnăturii sunt înregistrate automat."}</p>
        </div>
      </form>
    </div>,
    document.body,
  );
}
