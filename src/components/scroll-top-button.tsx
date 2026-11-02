"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export function ScrollTopButton({ threshold = 600 }: { threshold?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return (
    <button
      type="button"
      aria-label="Înapoi sus"
      title="Înapoi sus"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      data-testid="scroll-top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-24 right-4 z-40 grid size-12 place-items-center rounded-full bg-neon-green text-onaccent shadow-[0_0_20px_rgb(57_255_20/0.45)] transition-all duration-300 hover:scale-110 active:scale-95 md:bottom-8 md:right-8 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <ArrowUp className="size-6" strokeWidth={2.5} />
    </button>
  );
}
