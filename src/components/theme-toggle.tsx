"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

export type Theme = "system" | "light" | "dark";
export const THEME_KEY = "acromib-theme";

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));
const read = (): Theme => {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
};
const lightMedia = () => window.matchMedia("(prefers-color-scheme: light)");

function apply(theme: Theme) {
  const light = theme === "light" || (theme === "system" && lightMedia().matches);
  document.documentElement.dataset.theme = light ? "light" : "dark";
}

const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const META: Record<Theme, { icon: typeof Sun; label: string }> = {
  system: { icon: Monitor, label: "Sistem" },
  light: { icon: Sun, label: "Luminos" },
  dark: { icon: Moon, label: "Întunecat" },
};

/** App-wide Light/Dark switch (system → light → dark), stored per device on <html data-theme>. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);

  useEffect(() => {
    apply(theme);
    const mq = lightMedia();
    const onChange = () => apply(read());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const { icon: Icon, label } = META[theme];
  return (
    <button
      type="button"
      data-testid="theme-toggle"
      data-theme={theme}
      onClick={() => {
        try {
          localStorage.setItem(THEME_KEY, NEXT[theme]);
        } catch {}
        listeners.forEach((l) => l());
      }}
      aria-label={`Temă: ${label}. Apasă pentru ${META[NEXT[theme]].label}`}
      title={`Temă: ${label}`}
      className={`inline-flex ${compact ? "size-10" : "min-h-11 min-w-11"} shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-2.5 text-white/80 transition hover:border-neon-green/60 hover:text-neon-green active:scale-95`}
    >
      <Icon className="size-5 text-neon-orange" />
      {!compact && <span className="hidden text-xs font-bold sm:inline">{label}</span>}
    </button>
  );
}

/** Runs before first paint (root layout) so every page opens in the saved theme without a flash. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}")||"system";var l=t==="light"||(t==="system"&&matchMedia("(prefers-color-scheme: light)").matches);document.documentElement.dataset.theme=l?"light":"dark"}catch(e){}`;
