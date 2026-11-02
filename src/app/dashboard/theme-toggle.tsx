"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

export type AdminTheme = "system" | "light" | "dark";
export const ADMIN_THEME_KEY = "acromib-admin-theme";

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));
const read = (): AdminTheme => {
  try {
    const v = localStorage.getItem(ADMIN_THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
};
const lightMedia = () => window.matchMedia("(prefers-color-scheme: light)");

function apply(theme: AdminTheme) {
  const light = theme === "light" || (theme === "system" && lightMedia().matches);
  document.documentElement.dataset.adminTheme = light ? "light" : "dark";
}

const NEXT: Record<AdminTheme, AdminTheme> = { system: "light", light: "dark", dark: "system" };
const META: Record<AdminTheme, { icon: typeof Sun; label: string }> = {
  system: { icon: Monitor, label: "Sistem" },
  light: { icon: Sun, label: "Luminos" },
  dark: { icon: Moon, label: "Întunecat" },
};

/** Admin-only Light/Dark switch (system → light → dark). The theme lives on <html data-admin-theme> only while in /dashboard. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as AdminTheme);

  useEffect(() => {
    apply(theme);
    const mq = lightMedia();
    const onChange = () => apply(read());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  // Leaving the Admin restores the app's dark theme.
  useEffect(() => () => void delete document.documentElement.dataset.adminTheme, []);

  const { icon: Icon, label } = META[theme];
  return (
    <button
      type="button"
      data-testid="theme-toggle"
      data-theme={theme}
      onClick={() => {
        try {
          localStorage.setItem(ADMIN_THEME_KEY, NEXT[theme]);
        } catch {}
        listeners.forEach((l) => l());
      }}
      aria-label={`Temă: ${label}. Apasă pentru ${META[NEXT[theme]].label}`}
      title={`Temă: ${label}`}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-2.5 text-white/80 transition hover:border-neon-green/60 hover:text-neon-green active:scale-95"
    >
      <Icon className="size-5 text-neon-orange" />
      <span className="hidden text-xs font-bold sm:inline">{label}</span>
    </button>
  );
}

/** Runs before first paint (root layout) so /dashboard opens in the saved theme without a flash. */
export const ADMIN_THEME_SCRIPT = `try{if(location.pathname.startsWith("/dashboard")){var t=localStorage.getItem("${ADMIN_THEME_KEY}")||"system";var l=t==="light"||(t==="system"&&matchMedia("(prefers-color-scheme: light)").matches);document.documentElement.dataset.adminTheme=l?"light":"dark"}}catch(e){}`;
