"use client";

import { Clock, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ROW = 48;
const VISIBLE = 5;
const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const QUICK = [0, 15, 30, 45];

function parse(value: string): [number, number] {
  const [h, m] = value.split(":").map(Number);
  return [Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 0, Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0];
}

/** Scroll-snap wheel column; the centered row is the selection. */
function Wheel({ items, value, onChange, label }: { items: number[]; value: number; onChange: (v: number) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ROW) !== value) el.scrollTop = value * ROW;
  }, [value]);

  function onScroll() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      if (i !== value) onChange(i);
    });
  }

  return (
    <div className="relative flex-1">
      <div
        ref={ref}
        onScroll={onScroll}
        role="listbox"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const next = Math.min(items.length - 1, Math.max(0, value + (e.key === "ArrowDown" ? 1 : -1)));
            onChange(next);
          }
        }}
        className="relative z-10 [&::-webkit-scrollbar]:hidden snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-neon-green/60 rounded-2xl"
        style={{ height: ROW * VISIBLE, paddingBlock: ROW * Math.floor(VISIBLE / 2) }}
        data-testid={`wheel-${label === "Ore" ? "hours" : "minutes"}`}
      >
        {items.map((n) => {
          const selected = n === value;
          return (
            <button
              key={n}
              type="button"
              role="option"
              aria-selected={selected}
              tabIndex={-1}
              onClick={() => ref.current?.scrollTo({ top: n * ROW, behavior: "smooth" })}
              className={`block w-full snap-center text-center font-display tabular-nums transition-[color,transform] duration-150 ${
                selected ? "scale-110 text-3xl font-black text-neon-orange" : "text-2xl font-bold text-white/35"
              }`}
              style={{ height: ROW }}
            >
              {pad(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Dark-themed replacement for `<input type="time">`: a trigger button that opens an hour/minute wheel bottom sheet. */
export function TimePicker({
  value,
  onChange,
  label,
  name,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  name?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(0);
  const [m, setM] = useState(0);

  function show() {
    const [ph, pm] = parse(value);
    setH(ph);
    setM(pm);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    // Capture phase so Escape closes only the picker, not the form modal underneath.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  const [vh, vm] = parse(value);

  return (
    <>
      <button
        type="button"
        id={id}
        onClick={show}
        aria-haspopup="dialog"
        aria-label={`${label}: ${pad(vh)}:${pad(vm)}`}
        data-testid={name ? `time-${name}` : undefined}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-left outline-none transition hover:border-neon-orange/50 focus-visible:border-neon-orange/70 focus-visible:shadow-neon-sm active:scale-[0.98]"
      >
        <span className="font-display text-lg font-extrabold tabular-nums">
          {pad(vh)}:{pad(vm)}
        </span>
        <Clock className="size-4 text-neon-orange" />
      </button>
      {name && <input type="hidden" name={name} value={`${pad(vh)}:${pad(vm)}`} />}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Alege ora — ${label}`} data-testid="time-picker">
            <button type="button" aria-label="Anulează" tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 animate-[fade-in_.15s_ease-out] bg-black/75 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm animate-[sheet-up_.2s_ease-out] rounded-t-3xl border border-white/10 bg-surface px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-neon sm:rounded-3xl sm:pb-5">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/15 sm:hidden" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-green">{label}</p>
                  <p className="font-display text-3xl font-black tabular-nums" data-testid="time-picker-value">
                    {pad(h)}
                    <span className="text-neon-orange">:</span>
                    {pad(m)}
                  </p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Închide" className="grid size-11 place-items-center rounded-full text-white/60 hover:bg-white/5 hover:text-white">
                  <X className="size-5" />
                </button>
              </div>

              <div className="relative mt-4 flex items-stretch gap-2">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-2xl border border-neon-orange/50 bg-neon-orange/10"
                  style={{ height: ROW }}
                />
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-20 h-16 rounded-t-2xl bg-gradient-to-b from-surface to-transparent" />
                <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 rounded-b-2xl bg-gradient-to-t from-surface to-transparent" />
                <Wheel items={HOURS} value={h} onChange={setH} label="Ore" />
                <span aria-hidden className="z-10 self-center font-display text-3xl font-black text-neon-orange">
                  :
                </span>
                <Wheel items={MINUTES} value={m} onChange={setM} label="Minute" />
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setM(q)}
                    aria-pressed={m === q}
                    className={`min-h-11 rounded-xl text-sm font-bold tabular-nums transition active:scale-95 ${
                      m === q ? "bg-neon-green text-onaccent" : "border border-white/10 bg-black/40 text-white/70 hover:border-neon-green/50 hover:text-neon-green"
                    }`}
                  >
                    :{pad(q)}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-12 rounded-xl border border-white/15 text-sm font-bold text-white/80 transition hover:bg-white/5 active:scale-95"
                >
                  Anulează
                </button>
                <button
                  type="button"
                  data-testid="time-picker-set"
                  onClick={() => {
                    onChange(`${pad(h)}:${pad(m)}`);
                    setOpen(false);
                  }}
                  className="min-h-12 rounded-xl bg-neon-orange text-sm font-black text-onaccent shadow-neon transition hover:brightness-110 active:scale-95"
                >
                  Setează
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
