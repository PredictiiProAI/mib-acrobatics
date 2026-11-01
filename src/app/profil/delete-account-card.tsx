"use client";

import { Loader2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { deleteOwnAccount } from "@/lib/actions/account";
import { DELETE_CONFIRM_WORD, isDeleteConfirmation } from "@/lib/legal";

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-3xl border border-red-500/40 bg-carbon/80 p-6" data-testid="delete-account-card">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
        <Trash2 className="size-5 text-red-400" /> Ștergere cont
      </h2>
      <p className="mt-1 text-sm text-white/60">
        Șterge definitiv contul și toate datele tale: profilul, postările, fișierele, comentariile, reacțiile, mesajele și declarația semnată. Detalii în{" "}
        <Link href="/confidentialitate#stergere-cont" className="font-semibold text-neon-orange hover:text-neon-green">
          Politica de Confidențialitate
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-red-500/60 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/10"
        data-testid="delete-account-open"
      >
        <Trash2 className="size-4" /> Șterge contul
      </button>
      {open && <DeleteAccountModal onClose={() => setOpen(false)} />}
    </section>
  );
}

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [shown, setShown] = useState(false);
  const ready = isDeleteConfirmation(word);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, pending]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setError(null);
    start(async () => {
      const res = await deleteOwnAccount(word);
      if (res?.error) setError(res.error);
    });
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:p-4 ${shown ? "opacity-100" : "opacity-0"}`}
      onClick={() => !pending && onClose()}
      data-testid="delete-account-modal"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className={`w-full max-w-md rounded-t-3xl border border-red-500/50 bg-carbon p-5 shadow-2xl transition-transform duration-200 sm:rounded-3xl sm:p-6 ${shown ? "translate-y-0" : "translate-y-6"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="delete-account-title" className="font-display text-xl font-black text-white">
            Ștergi definitiv contul?
          </h2>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Închide" className="rounded-xl p-2 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-white/75">
          Acțiunea nu poate fi anulată. Contul, profilul, postările, fișierele, comentariile, reacțiile, mesajele și declarația semnată vor fi șterse imediat, iar tu vei fi deconectat.
        </p>
        <label className="mt-4 block text-sm font-semibold text-white/80">
          Scrie <span className="text-red-300">{DELETE_CONFIRM_WORD}</span> pentru a confirma
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            className="mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-3 font-normal text-white outline-none focus:border-red-400"
            data-testid="delete-account-word"
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 text-sm font-semibold text-red-400" data-testid="delete-account-error">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" onClick={onClose} disabled={pending} className="flex-1 rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/5">
            Anulează
          </button>
          <button
            type="submit"
            disabled={!ready || pending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="delete-account-submit"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Șterge contul
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
