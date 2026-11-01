"use client";

import { Check, Loader2, RotateCcw, Save, Search, Shuffle, Sparkles, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { foldText, HERO_TEMPLATES, HERO_TEXT_MAX } from "@/lib/acrofeed";

const SEARCHABLE = HERO_TEMPLATES.map((text, i) => ({ text, n: i + 1, key: foldText(text) }));
import { saveHeroText } from "@/lib/actions/acrofeed";

export function HeroTextEditor({ initialText }: { initialText: string }) {
  const [saved, setSaved] = useState(initialText);
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const q = foldText(query.trim());
  const shown = useMemo(() => (q ? SEARCHABLE.filter((t) => t.key.includes(q) || String(t.n) === q) : SEARCHABLE), [q]);
  const pick = (t: string) => {
    setText(t);
    setStatus(null);
  };
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-neon-orange" /> Șabloane ({HERO_TEMPLATES.length})
          </h2>
          <button
            type="button"
            onClick={() => pick(HERO_TEMPLATES[Math.floor(Math.random() * HERO_TEMPLATES.length)])}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-neon-green/50 hover:text-neon-green"
            data-testid="hero-random"
          >
            <Shuffle className="size-3.5" /> Aleatoriu
          </button>
        </div>
        <p className="mt-1 text-xs text-white/50">Apasă pe un șablon ca să-l pui în câmpul de text, apoi salvează.</p>
        <label className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm focus-within:border-neon-orange/70">
          <Search className="size-4 shrink-0 text-white/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută: trambulină, curaj, backflip… sau numărul"
            className="w-full bg-transparent outline-none placeholder:text-white/30 [&::-webkit-search-cancel-button]:hidden"
            data-testid="hero-search"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Șterge căutarea" className="text-white/40 hover:text-white">
              <X className="size-4" />
            </button>
          )}
        </label>
        <p className="mt-2 text-xs text-white/40" data-testid="hero-count">
          {q ? `${shown.length} din ${HERO_TEMPLATES.length} șabloane` : `Toate cele ${HERO_TEMPLATES.length} de șabloane`}
        </p>
        <ul className="mt-2 grid max-h-[32rem] gap-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]" data-testid="hero-templates">
          {shown.map(({ text: t, n }) => {
            const active = text.trim() === t;
            return (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => pick(t)}
                  aria-pressed={active}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm leading-snug transition ${
                    active ? "border-neon-orange bg-neon-orange/15 text-white" : "border-white/10 bg-white/[0.03] text-white/75 hover:border-neon-green/50 hover:text-white"
                  }`}
                >
                  <span className={`mr-2 font-display text-xs font-black ${active ? "text-neon-orange" : "text-neon-green"}`}>#{n}</span>
                  {t}
                </button>
              </li>
            );
          })}
          {!shown.length && <li className="py-8 text-center text-sm text-white/40">Niciun șablon găsit.</li>}
        </ul>
      </section>
    </div>
  );
}
