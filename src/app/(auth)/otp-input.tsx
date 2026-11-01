"use client";

import { useRef, useState } from "react";

const LENGTH = 6;

/** Six single-digit boxes (paste, auto-advance, Backspace/Delete, arrows) backed by one hidden `name` input; calls onComplete when full. */
export function OtpInput({ name = "token", onComplete, disabled }: { name?: string; onComplete?: () => void; disabled?: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focus = (i: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus();

  const commit = (next: string[]) => {
    setDigits(next);
    if (next.every(Boolean)) requestAnimationFrame(() => onComplete?.());
  };

  const setAt = (i: number, value: string) => {
    const next = [...digits];
    next[i] = value;
    commit(next);
  };

  // Writes several digits starting at `start` (paste / SMS autofill).
  const fillFrom = (start: number, text: string) => {
    const chars = text.replace(/\D/g, "").slice(0, LENGTH - start).split("");
    if (!chars.length) return;
    const next = [...digits];
    chars.forEach((c, k) => (next[start + k] = c));
    commit(next);
    focus(start + chars.length);
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" data-testid="otp-input">
      <input type="hidden" name={name} value={digits.join("")} />
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          disabled={disabled}
          autoFocus={i === 0}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Cifra ${i + 1}`}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, "");
            if (!typed) return setAt(i, "");
            // A filled box receives "old+new" (or "new+old"); keep the newly typed digit.
            if (typed.length === 2 && d && typed.includes(d)) {
              setAt(i, typed[0] === d ? typed[1] : typed[0]);
              return focus(i + 1);
            }
            if (typed.length > 1) return fillFrom(i, typed);
            setAt(i, typed);
            focus(i + 1);
          }}
          onPaste={(e) => {
            e.preventDefault();
            fillFrom(0, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              if (d) setAt(i, "");
              else if (i > 0) {
                const next = [...digits];
                next[i - 1] = "";
                setDigits(next);
                focus(i - 1);
              }
            } else if (e.key === "Delete") {
              e.preventDefault();
              setAt(i, "");
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              focus(i - 1);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              focus(i + 1);
            }
          }}
          className={`size-12 rounded-xl border bg-black/60 text-center font-display text-2xl font-black outline-none transition sm:size-14 ${
            d ? "border-neon-violet text-neon-violet shadow-neon-sm" : "border-white/15 text-white"
          } focus:border-neon-violet focus:shadow-neon`}
        />
      ))}
    </div>
  );
}
