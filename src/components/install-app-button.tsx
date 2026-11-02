"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

type Mode = "hidden" | "ios" | "prompt";

function detect(): Mode {
  const w = window as Window & { Capacitor?: unknown };
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone || w.Capacitor) return "hidden";
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  return deferred ? "prompt" : "hidden";
}

/** "Instalează aplicația": native install prompt on Android/desktop Chrome, Add-to-Home-Screen steps on iPhone/iPad. */
export function InstallAppButton({ className = "" }: { className?: string }) {
  const mode = useSyncExternalStore(subscribe, detect, () => "hidden" as Mode);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if (!help) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setHelp(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [help]);

  if (mode === "hidden") return null;

  async function onClick() {
    if (mode === "ios") return setHelp(true);
    const e = deferred;
    if (!e) return;
    await e.prompt();
    await e.userChoice.catch(() => null);
    deferred = null;
    emit();
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        data-testid="install-app"
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-neon-green/50 bg-neon-green/10 px-5 py-3 text-sm font-bold text-neon-green transition hover:bg-neon-green/20 ${className}`}
      >
        <Download className="size-5" /> Instalează aplicația
      </button>
      {help &&
        createPortal(
          <div className="fixed inset-0 z-[95] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Instalează pe iPhone" data-testid="install-ios-help">
            <button type="button" aria-label="Închide" tabIndex={-1} onClick={() => setHelp(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm animate-[sheet-up_.2s_ease-out] rounded-3xl border border-neon-orange/40 bg-carbon/95 p-6 shadow-neon">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-extrabold">Instalează pe iPhone</h2>
                <button type="button" onClick={() => setHelp(false)} aria-label="Închide" className="rounded-full p-1.5 text-white/60 hover:bg-white/5 hover:text-white">
                  <X className="size-5" />
                </button>
              </div>
              <ol className="mt-5 space-y-4 text-sm text-white/80">
                <li className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-neon-orange text-xs font-black text-black">1</span>
                  <span>
                    Apasă butonul <Share className="inline size-4 align-text-bottom text-neon-green" aria-label="Distribuie" /> <b>Distribuie</b> din bara Safari (jos sau sus).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-neon-orange text-xs font-black text-black">2</span>
                  <span>
                    Derulează și alege <SquarePlus className="inline size-4 align-text-bottom text-neon-green" aria-hidden /> <b>Adaugă pe ecranul principal</b> (Add to Home Screen).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-neon-orange text-xs font-black text-black">3</span>
                  <span>
                    Apasă <b>Adaugă</b>. Iconul AcroMIB apare pe ecran și aplicația se deschide pe tot ecranul, ca o aplicație normală.
                  </span>
                </li>
              </ol>
              <p className="mt-5 text-xs text-white/45">Dacă nu vezi opțiunea, deschide site-ul în Safari.</p>
              <button type="button" onClick={() => setHelp(false)} className="mt-5 w-full rounded-xl bg-neon-orange px-5 py-3 text-sm font-bold text-black shadow-neon">
                Am înțeles
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
