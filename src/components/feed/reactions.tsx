"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { REACTIONS, type ReactionCounts, type ReactionKey, DEFAULT_REACTION, reactionInfo } from "@/lib/reactions";

const HOVER_OPEN_MS = 350;
const HOVER_CLOSE_MS = 300;
const LONG_PRESS_MS = 450;

/**
 * Messenger-style reaction trigger: tap/click toggles the default reaction, hovering (mouse)
 * or long-pressing (touch) opens the bar with every reaction.
 */
export function ReactionTrigger({
  mine,
  onReact,
  children,
  className = "",
  align = "left",
  label = "Reacționează",
}: {
  mine: ReactionKey | null;
  onReact: (next: ReactionKey | null) => void;
  children: ReactNode;
  className?: string;
  align?: "left" | "center";
  label?: string;
}) {
  const [open, setOpenState] = useState(false);
  const [below, setBelow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  // Flip the bar under the trigger when there is no room above it (e.g. first comment in a scroll list).
  const setOpen = (v: boolean) => {
    if (v) setBelow((root.current?.getBoundingClientRect().top ?? 999) < 90);
    setOpenState(v);
  };

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const later = (fn: () => void, ms: number) => {
    clear();
    timer.current = setTimeout(fn, ms);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpenState(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenState(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => clear, []);

  const pick = (key: ReactionKey) => {
    clear();
    setOpen(false);
    onReact(key === mine ? null : key);
  };

  return (
    <div
      ref={root}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && later(() => setOpen(true), HOVER_OPEN_MS)}
      onPointerLeave={(e) => e.pointerType === "mouse" && later(() => setOpen(false), HOVER_CLOSE_MS)}
    >
      {open && (
        <div
          role="toolbar"
          aria-label="Alege o reacție"
          data-testid="reaction-bar"
          className={`absolute z-20 flex ${below ? "top-full mt-2" : "bottom-full mb-2"} animate-[pop-in_.16s_ease-out] items-center gap-0.5 rounded-full border border-white/10 bg-carbon/95 p-1.5 shadow-[0_10px_40px_-8px_rgb(0_0_0/0.8),0_0_24px_-6px_rgb(255_106_0/0.5)] backdrop-blur-xl ${
            align === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
          }`}
        >
          {REACTIONS.map((r, i) => (
            <button
              key={r.key}
              type="button"
              title={r.label}
              aria-label={r.label}
              aria-pressed={mine === r.key}
              onClick={() => pick(r.key)}
              style={{ animationDelay: `${i * 25}ms` }}
              className={`grid size-10 animate-[pop-in_.2s_ease-out_both] place-items-center rounded-full text-2xl transition duration-150 hover:-translate-y-1.5 hover:scale-125 ${
                mine === r.key ? "bg-neon-orange/20 ring-1 ring-neon-orange/50" : "hover:bg-white/5"
              }`}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-label={mine ? `Retrage reacția ${reactionInfo(mine).label}` : label}
        aria-pressed={!!mine}
        data-reaction={mine ?? ""}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          longPressed.current = false;
          later(() => {
            longPressed.current = true;
            setOpen(true);
            navigator.vibrate?.(10);
          }, LONG_PRESS_MS);
        }}
        onPointerUp={(e) => e.pointerType !== "mouse" && !longPressed.current && clear()}
        onPointerCancel={clear}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (longPressed.current) {
            longPressed.current = false;
            return;
          }
          clear();
          setOpen(false);
          onReact(mine ? null : DEFAULT_REACTION);
        }}
        className={`select-none [-webkit-touch-callout:none] ${className}`}
      >
        {children}
      </button>
    </div>
  );
}

/** Mini counter pills (❤️ 5 🔥 2), most used first; the viewer's reaction is highlighted. */
export function ReactionSummary({ counts, mine, className = "" }: { counts: ReactionCounts; mine: ReactionKey | null; className?: string }) {
  const entries = REACTIONS.map((r) => ({ ...r, n: counts[r.key] ?? 0 }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);
  if (!entries.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`} data-testid="reaction-summary">
      {entries.map((r) => (
        <span
          key={r.key}
          title={r.label}
          data-testid="reaction-pill"
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
            mine === r.key ? "bg-neon-orange/15 text-neon-orange ring-1 ring-neon-orange/40" : "bg-white/[0.06] text-white/75 ring-1 ring-white/10"
          }`}
        >
          <span className="text-sm leading-none">{r.emoji}</span>
          {r.n}
        </span>
      ))}
    </div>
  );
}
