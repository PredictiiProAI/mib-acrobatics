"use client";

import { Check, Loader2, RotateCcw, Save, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { HERO_TEMPLATES, HERO_TEXT_MAX } from "@/lib/acrofeed";
import { saveHeroText } from "@/lib/actions/acrofeed";

export function HeroTextEditor({ initialText }: { initialText: string }) {
  const [saved, setSaved] = useState(initialText);
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = text.trim() !== saved;
  const tooLong = text.length > HERO_TEXT_MAX;

  function save() {
    startTransition(async () => {
      const r = await saveHeroText(text);
      if (!r.ok) return setStatus({ ok: false, message: r.error });
      setSaved(text.trim());
      setText(text.trim());
      setStatus({ ok: true, message: "Salvat! Mesajul apare acum în AcroFeed." });
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="glass space-y-4 rounded-3xl p-5 sm:p-6">
        <label htmlFor="hero-text" className="text-sm font-semibold">
          Mesajul zilei
        </label>
        <textarea
          id="hero-text"
          data-testid="hero-text"
          rows={5}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setStatus(null);
          }}
          className="w-full resize-y rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-white/30 focus:border-neon-orange/70"
          placeholder="Scrie mesajul pentru AcroFeed…"
        />
        <p className={`text-right text-xs ${tooLong ? "text-red-300" : "text-white/40"}`}>
          {text.length}/{HERO_TEXT_MAX}
        </p>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-neon-orange/15 via-carbon to-neon-green/10 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neon-green">Previzualizare</p>
          <p className="mt-2 font-display text-xl font-black">Salut, Ana!</p>
          <p className="mt-1 whitespace-pre-line break-words text-sm text-white/60">{text.trim() || "…"}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={pending || !dirty || !text.trim() || tooLong} data-testid="hero-save">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvează
          </Button>
          {dirty && (
            <Button variant="ghost" onClick={() => setText(saved)} disabled={pending}>
              <RotateCcw className="size-4" /> Anulează modificările
            </Button>
          )}
          {status && (
            <span role="status" className={`inline-flex items-center gap-1.5 text-sm ${status.ok ? "text-neon-green" : "text-red-300"}`} data-testid="hero-status">
              {status.ok && <Check className="size-4" />} {status.message}
            </span>
          )}
        </div>
      </section>

      <section className="glass flex flex-col rounded-3xl p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-neon-orange" /> Șabloane ({HERO_TEMPLATES.length})
        </h2>
        <p className="mt-1 text-xs text-white/50">Apasă pe un șablon ca să-l pui în câmpul de text, apoi salvează.</p>
        <ul className="mt-4 grid max-h-[32rem] gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]" data-testid="hero-templates">
          {HERO_TEMPLATES.map((t, i) => {
            const active = text.trim() === t;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    setText(t);
                    setStatus(null);
                  }}
                  aria-pressed={active}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm leading-snug transition ${
                    active ? "border-neon-orange bg-neon-orange/15 text-white" : "border-white/10 bg-white/[0.03] text-white/75 hover:border-neon-green/50 hover:text-white"
                  }`}
                >
                  <span className={`mr-2 font-display text-xs font-black ${active ? "text-neon-orange" : "text-neon-green"}`}>#{i + 1}</span>
                  {t}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
