"use client";

import { AlertTriangle, CheckCircle2, FileSignature, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { signWaiver } from "@/lib/actions/waiver";
import { WAIVER_PARAGRAPHS, WAIVER_TITLE } from "@/lib/waiver";

const fmt = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Bucharest" });

type Props = { signed: boolean; signedAt: string | null; signedBy: string | null; defaultName: string };

export function WaiverCard({ signed, signedAt, signedBy, defaultName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={`rounded-3xl border bg-carbon/80 p-6 ${signed ? "border-neon-green/40" : "border-red-500/60"}`}
      data-testid="waiver-card"
      data-signed={signed}
    >
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
        <FileSignature className="size-5 text-neon-orange" /> Documente Legale & Siguranță
      </h2>
      <p className="mt-1 text-sm text-white/60">{WAIVER_TITLE}</p>

      {signed ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-neon-green/40 bg-neon-green/10 p-4" data-testid="waiver-signed">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-neon-green" />
          <div className="text-sm">
            <p className="font-bold text-neon-green">Declarație semnată</p>
            <p className="mt-1 text-white/70">
              Semnată de <span className="font-semibold text-white">{signedBy}</span>
              {signedAt && <> pe {fmt.format(new Date(signedAt))}</>}.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/60 bg-red-500/10 p-4" data-testid="waiver-warning">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-400" />
            <p className="text-sm font-semibold text-red-300">
              Acțiune necesară: Nu poți participa la antrenamente până nu semnezi declarația de asumare a riscurilor.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-neon-orange px-5 py-3 text-sm font-bold text-black transition hover:bg-neon-green"
            data-testid="waiver-open"
          >
            <FileSignature className="size-4" /> Semnează Declarația
          </button>
        </>
      )}

      {open && <WaiverModal defaultName={defaultName} onClose={() => setOpen(false)} />}
    </section>
  );
}

function WaiverModal({ defaultName, onClose }: { defaultName: string; onClose: () => void }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [pending, start] = useTransition();

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
      const res = await signWaiver({ name, agreed });
      if (!res.ok) return setError(res.error);
      onClose();
      router.refresh();
    });
  };

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
        className={`flex max-h-[95dvh] w-full max-w-2xl flex-col rounded-t-3xl border border-neon-orange/40 bg-carbon p-5 shadow-2xl transition-transform duration-200 sm:rounded-3xl sm:p-6 ${shown ? "translate-y-0" : "translate-y-6"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-neon-green">Semnătură digitală</p>
            <h2 id="waiver-title" className="mt-1 font-display text-xl font-black text-white">{WAIVER_TITLE}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Închide" className="rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 min-h-32 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-sm leading-relaxed text-white/80" tabIndex={0} data-testid="waiver-text">
          {WAIVER_PARAGRAPHS.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
            className="mt-0.5 size-5 shrink-0 accent-[#ff6a00]"
            data-testid="waiver-agree"
          />
          Am citit, am înțeles și sunt de acord cu termenii de mai sus.
        </label>

        <label className="mt-4 block text-sm font-semibold text-white/80">
          Numele și Prenumele (pentru semnătura digitală)
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={3}
            maxLength={120}
            autoComplete="name"
            placeholder="ex. Popescu Maria"
            className="mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-3 font-normal text-white outline-none focus:border-neon-orange"
            data-testid="waiver-name"
          />
        </label>

        {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-400" data-testid="waiver-error">{error}</p>}

        <button
          type="submit"
          disabled={pending || !agreed || name.trim().length < 3}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff6a00] px-5 py-3.5 text-sm font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="waiver-submit"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <FileSignature className="size-4" />} Trimite și Semnează
        </button>
      </form>
    </div>,
    document.body
  );
}
