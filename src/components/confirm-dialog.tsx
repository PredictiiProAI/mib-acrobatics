"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning";
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

/**
 * Promise-based replacement for window.confirm():
 *   const [confirm, confirmDialog] = useConfirm();
 *   if (await confirm({ title: "Ștergi?" })) ...
 * Render `confirmDialog` anywhere in the component.
 */
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })), []);
  const close = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
    },
    [pending],
  );
  const dialog = pending ? <ConfirmDialog {...pending} onClose={close} /> : null;
  return [confirm, dialog] as const;
}

function ConfirmDialog({ title, description, confirmLabel = "Confirmă", cancelLabel = "Anulează", tone = "danger", onClose }: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [onClose]);

  const Icon = tone === "danger" ? AlertTriangle : ShieldAlert;
  const danger = tone === "danger";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" data-testid="confirm-dialog">
      <button type="button" aria-label={cancelLabel} tabIndex={-1} onClick={() => onClose(false)} className="absolute inset-0 animate-[fade-in_.15s_ease-out] bg-black/75 backdrop-blur-sm" />
      <div className="relative w-full max-w-md animate-[sheet-up_.2s_ease-out] overflow-hidden rounded-3xl border border-white/10 bg-carbon/95 p-6 shadow-[0_0_60px_-15px_rgb(168_85_247/0.45)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-violet to-transparent" />
        <div className="flex gap-4">
          <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${danger ? "bg-red-500/10 text-red-400" : "bg-neon-violet/10 text-neon-violet"}`}>
            <Icon className="size-6" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id="confirm-title" className="font-display text-lg font-extrabold">
              {title}
            </h2>
            {description && <div className="mt-1.5 text-sm text-white/60">{description}</div>}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => onClose(false)} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/25 hover:text-white">
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onClose(true)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon ${
              danger ? "bg-red-500 text-white focus-visible:ring-red-400" : "bg-neon-violet text-black glow-orange focus-visible:ring-neon-violet"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
