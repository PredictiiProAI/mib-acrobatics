"use client";

import { Check, Link2, Loader2, Megaphone, Plus, Save, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { AnnouncementBanner, QuickLinks } from "@/components/feed/feed-extras";
import { Button } from "@/components/ui";
import {
  ANNOUNCEMENT_MAX,
  ANNOUNCEMENT_TONES,
  QUICK_LINK_TITLE_MAX,
  QUICK_LINKS_MAX,
  type Announcement,
  type QuickLink,
} from "@/lib/acrofeed";
import { saveAnnouncement, saveQuickLinks } from "@/lib/actions/acrofeed";
import type { ActionResult } from "@/lib/actions/posts";

const field = "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[15px] outline-none placeholder:text-white/30 focus:border-neon-orange/70";

function useSave() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const run = (fn: () => Promise<ActionResult>, okMessage: string) =>
    startTransition(async () => {
      const r = await fn();
      setStatus(r.ok ? { ok: true, message: okMessage } : { ok: false, message: r.error });
    });
  const view = status && (
    <span role="status" data-testid="extras-status" className={`inline-flex items-center gap-1.5 text-sm ${status.ok ? "text-neon-green" : "text-red-300"}`}>
      {status.ok && <Check className="size-4" />} {status.message}
    </span>
  );
  return { pending, run, view, clear: () => setStatus(null) };
}

export function AnnouncementEditor({ initial }: { initial: Announcement }) {
  const [a, setA] = useState(initial);
  const save = useSave();
  const update = (patch: Partial<Announcement>) => {
    setA((v) => ({ ...v, ...patch }));
    save.clear();
  };
  return (
    <section className="glass space-y-4 rounded-3xl p-5 sm:p-6" data-testid="announcement-editor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Megaphone className="size-5 text-neon-orange" /> Anunț Important
        </h2>
        <button
          type="button"
          role="switch"
          aria-checked={a.enabled}
          onClick={() => update({ enabled: !a.enabled })}
          data-testid="announcement-toggle"
          className="inline-flex items-center gap-2 text-sm font-semibold"
        >
          <span className={`relative h-6 w-11 rounded-full transition ${a.enabled ? "bg-neon-green" : "bg-white/15"}`}>
            <span className={`absolute top-0.5 size-5 rounded-full bg-black shadow transition-all ${a.enabled ? "left-[22px]" : "left-0.5 bg-white/80"}`} />
          </span>
          {a.enabled ? "Activ" : "Oprit"}
        </button>
      </div>
      <textarea
        rows={3}
        value={a.text}
        maxLength={ANNOUNCEMENT_MAX}
        onChange={(e) => update({ text: e.target.value })}
        placeholder="Ex.: Nu uitați de competiția de vineri!"
        className={`${field} resize-y`}
        data-testid="announcement-text"
      />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Stil anunț">
        {ANNOUNCEMENT_TONES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={a.tone === t.value}
            onClick={() => update({ tone: t.value })}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${a.tone === t.value ? "bg-neon-orange text-black" : "bg-white/5 text-white/70 hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-neon-green">Previzualizare</p>
        {a.text.trim() ? (
          <div className={a.enabled ? "" : "opacity-40"}>
            <AnnouncementBanner announcement={{ ...a, text: a.text.trim() }} />
          </div>
        ) : (
          <p className="text-sm text-white/40">Scrie un mesaj ca să vezi cum arată.</p>
        )}
        {!a.enabled && a.text.trim() && <p className="mt-2 text-xs text-white/40">Anunțul este oprit și nu apare în AcroMib.</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => save.run(() => saveAnnouncement(a), a.enabled ? "Salvat! Anunțul apare în AcroMib." : "Salvat! Anunțul este ascuns.")} disabled={save.pending} data-testid="announcement-save">
          {save.pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvează anunțul
        </Button>
        {save.view}
      </div>
    </section>
  );
}

export function QuickLinksEditor({ initial }: { initial: QuickLink[] }) {
  const [links, setLinks] = useState<QuickLink[]>(initial.length ? initial : [{ title: "", url: "" }]);
  const save = useSave();
  const set = (i: number, patch: Partial<QuickLink>) => {
    setLinks((list) => list.map((l, j) => (j === i ? { ...l, ...patch } : l)));
    save.clear();
  };
  const filled = links.filter((l) => l.title.trim() && l.url.trim());
  return (
    <section className="glass space-y-4 rounded-3xl p-5 sm:p-6" data-testid="links-editor">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Link2 className="size-5 text-neon-green" /> Linkuri Utile
        <span className="text-sm font-normal text-white/40">(maxim {QUICK_LINKS_MAX})</span>
      </h2>
      <p className="text-sm text-white/55">Butoane rapide afișate sus în AcroMib, ex. „Regulament”, „Grup WhatsApp”, „Plată Abonament”.</p>
      <ul className="space-y-3">
        {links.map((l, i) => (
          <li key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
            <input value={l.title} maxLength={QUICK_LINK_TITLE_MAX} onChange={(e) => set(i, { title: e.target.value })} placeholder="Titlu" className={field} data-testid="link-title" />
            <input value={l.url} onChange={(e) => set(i, { url: e.target.value })} placeholder="https://… sau /schedule" inputMode="url" className={field} data-testid="link-url" />
            <button
              type="button"
              onClick={() => {
                setLinks((list) => list.filter((_, j) => j !== i));
                save.clear();
              }}
              aria-label={`Șterge linkul ${l.title || i + 1}`}
              className="grid h-12 place-items-center rounded-xl border border-white/10 px-3 text-white/60 hover:border-red-500/50 hover:text-red-300"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {links.length < QUICK_LINKS_MAX && (
        <button
          type="button"
          onClick={() => setLinks((list) => [...list, { title: "", url: "" }])}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-white/15 px-3 py-2 text-sm font-semibold text-white/70 hover:border-neon-green/50 hover:text-neon-green"
          data-testid="link-add"
        >
          <Plus className="size-4" /> Adaugă link
        </button>
      )}
      {filled.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-neon-green">Previzualizare</p>
          <QuickLinks links={filled} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => save.run(() => saveQuickLinks(links), "Salvat! Linkurile apar în AcroMib.")} disabled={save.pending} data-testid="links-save">
          {save.pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvează linkurile
        </Button>
        {save.view}
      </div>
    </section>
  );
}
