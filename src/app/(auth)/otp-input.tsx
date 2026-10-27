"use client";

import { useRef, useState } from "react";

const LENGTH = 6;

/** Six single-digit boxes (paste + auto-advance) backed by one hidden `name` input; calls onComplete when full. */
export function OtpInput({ name = "token", onComplete, disabled }: { name?: string; onComplete?: () => void; disabled?: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const update = (next: string[]) => {
    setDigits(next);
    if (next.every(Boolean)) requestAnimationFrame(() => onComplete?.());
  };

  const fill = (start: number, text: string) => {
    const chars = text.replace(/\D/g, "").slice(0, LENGTH - start).split("");
    if (!chars.length) return;
    const next = [...digits];
    chars.forEach((c, i) => (next[start + i] = c));
    update(next);
    refs.current[Math.min(start + chars.length, LENGTH - 1)]?.focus();
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
          maxLength={LENGTH}
          onChange={(e) => fill(i, e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            fill(0, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              const next = [...digits];
              next[i - 1] = "";
              setDigits(next);
              refs.current[i - 1]?.focus();
            } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            else if (e.key === "ArrowRight" && i < LENGTH - 1) refs.current[i + 1]?.focus();
          }}
          className={`size-12 rounded-xl border bg-black/60 text-center font-display text-2xl font-black outline-none transition sm:size-14 ${
            d ? "border-neon-violet text-neon-violet shadow-neon-sm" : "border-white/15 text-white"
          } focus:border-neon-violet focus:shadow-neon`}
        />
      ))}
    </div>
  );
}
