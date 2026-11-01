"use client";

import { AlertTriangle, CheckCircle2, FileSignature, Loader2, Plus, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { submitWaiver } from "@/lib/actions/waiver";
import type { Database } from "@/lib/supabase/database.types";
import {
  MEDICAL_FIELDS,
  NOT_APPLICABLE,
  WAIVER_ACKS,
  WAIVER_INTRO,
  WAIVER_TITLE,
  type MedicalKey,
  type WaiverAck,
  type WaiverForm,
} from "@/lib/waiver";

export type WaiverSubmission = Database["public"]["Tables"]["waiver_submissions"]["Row"];

const fmt = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bucharest" });
const input =
  "mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-3 font-normal text-white outline-none placeholder:text-white/30 focus:border-neon-orange";

type Props = { form: WaiverForm; submissions: WaiverSubmission[]; defaultName: string; defaultPhone: string };

/** Latest submission per child (parent) or the latest one (athlete). */
function current(form: WaiverForm, submissions: WaiverSubmission[]) {
  if (form === "sportiv") return submissions.slice(0, 1);
  const seen = new Set<string>();
  return submissions.filter((s) => {
    const key = (s.child_name ?? "").toLocaleLowerCase("ro-RO");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function WaiverCard({ form, submissions, defaultName, defaultPhone }: Props) {
  const [open, setOpen] = useState<WaiverSubmission | "new" | null>(null);
  const latest = current(form, submissions);
  const signed = latest.length > 0;

  return (
    <section
      className={`rounded-3xl border bg-carbon/80 p-6 ${signed ? "border-neon-green/40" : "border-red-500/60"}`}
      data-testid="waiver-card"
      data-signed={signed}
    >
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
        <FileSignature className="size-5 text-neon-orange" /> Documente Legale & Siguranță
      </h2>
      <p className="mt-1 text-sm text-white/60">
        {WAIVER_TITLE} — {form === "parinte" ? "acord parental și fișa medicală a copilului" : "declarație pentru sportivi majori"}
      </p>

      {signed ? (
        <ul className="mt-4 space-y-3">
          {latest.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 rounded-2xl border border-neon-green/40 bg-neon-green/10 p-4 sm:flex-row sm:items-center" data-testid="waiver-signed">
              <CheckCircle2 className="size-5 shrink-0 text-neon-green" />
              <div className="flex-1 text-sm">
                <p className="font-bold text-neon-green">{s.child_name ? `Fișă semnată pentru ${s.child_name}` : "Declarație & fișă medicală semnată"}</p>
                <p className="mt-1 text-white/70">
                  Semnată de <span className="font-semibold text-white">{s.signer_name}</span> pe {fmt.format(new Date(s.signed_at))}.
                </p>
                <Link href={`/declaratie/${s.id}`} className="mt-1 inline-block text-xs font-bold text-neon-orange hover:text-neon-green" data-testid="waiver-document-link">
                  Vezi / descarcă PDF
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setOpen(s)}
                className="inline-flex items-center gap-1.5 self-start rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-white/80 hover:border-neon-orange hover:text-neon-orange sm:self-center"
                data-testid="waiver-update"
              >
                <RefreshCw className="size-3.5" /> Actualizează
              </button>
            </li>
          ))}
          {form === "parinte" && (
            <button
              type="button"
              onClick={() => setOpen("new")}
              className="inline-flex items-center gap-2 rounded-2xl border border-neon-orange/50 px-4 py-2.5 text-sm font-bold text-neon-orange hover:bg-neon-orange/10"
              data-testid="waiver-add-child"
            >
              <Plus className="size-4" /> Adaugă fișă pentru alt copil
            </button>
          )}
        </ul>
      ) : (
        <>
          <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/60 bg-red-500/10 p-4" data-testid="waiver-warning">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-400" />
            <p className="text-sm font-semibold text-red-300">
              Acțiune necesară: Nu {form === "parinte" ? "poate participa copilul tău" : "poți participa"} la antrenamente până nu semnezi declarația și nu completezi fișa medicală.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen("new")}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-neon-orange px-5 py-3 text-sm font-bold text-black transition hover:bg-neon-green"
            data-testid="waiver-open"
          >
            <FileSignature className="size-4" /> Semnează Declarația
          </button>
        </>
      )}

      {open && (
        <WaiverModal
          form={form}
          prefill={open === "new" ? (form === "parinte" ? undefined : submissions[0]) : open}
          defaultName={defaultName}
          defaultPhone={defaultPhone}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}

function WaiverModal({
  form,
  prefill,
  defaultName,
  defaultPhone,
  onClose,
}: {
  form: WaiverForm;
  prefill?: WaiverSubmission;
  defaultName: string;
  defaultPhone: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [signerName, setSignerName] = useState(prefill?.signer_name ?? defaultName);
  const [childName, setChildName] = useState(prefill?.child_name ?? "");
  const [childBirthdate, setChildBirthdate] = useState(prefill?.child_birthdate ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(prefill?.emergency_phone ?? defaultPhone);
  const [emergencySecondary, setEmergencySecondary] = useState(prefill?.emergency_secondary ?? "");
  const [medical, setMedical] = useState<Record<MedicalKey, string>>(() =>
    Object.fromEntries(MEDICAL_FIELDS.map((f) => [f.key, prefill?.[f.key] ?? ""])) as Record<MedicalKey, string>,
  );
  const [acks, setAcks] = useState<WaiverAck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [pending, start] = useTransition();
  const ackList = WAIVER_ACKS[form];
  const complete =
    signerName.trim().includes(" ") &&
    emergencyPhone.trim().length >= 6 &&
    MEDICAL_FIELDS.every((f) => medical[f.key].trim()) &&
    ackList.every((a) => acks.includes(a.key)) &&
    (form === "sportiv" || (childName.trim().length >= 3 && !!childBirthdate));

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
      const res = await submitWaiver({ signerName, childName, childBirthdate, emergencyPhone, emergencySecondary, medical, acks });
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
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-neon-green">{form === "parinte" ? "Acord parental" : "Sportiv major"}</p>
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
            {WAIVER_INTRO[form].map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {form === "parinte" && (
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
          )}

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
            Numele și Prenumele {form === "parinte" ? "părintelui / tutorelui" : ""} (semnătură digitală)
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
            {pending ? <Loader2 className="size-4 animate-spin" /> : <FileSignature className="size-4" />} Trimite și Semnează
          </button>
          <p className="mt-2 text-center text-xs text-white/45">Data și ora semnăturii sunt înregistrate automat.</p>
        </div>
      </form>
    </div>,
    document.body,
  );
}
