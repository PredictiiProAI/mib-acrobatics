"use client";

import { ChevronRight, Loader2, SmilePlus, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/avatar";
import { RoleBadge } from "@/components/role-badge";
import { badgeRole } from "@/lib/roles";
import type { AppRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { REACTIONS, type ReactionCounts, type ReactionKey, DEFAULT_REACTION, reactionInfo, sortReactions, toggleReaction } from "@/lib/reactions";

const HOVER_OPEN_MS = 350;
const HOVER_CLOSE_MS = 300;
const LONG_PRESS_MS = 450;
const BAR_WIDTH = 222;

/**
 * Messenger-style reaction trigger: tap/click adds the default reaction (or removes all of the viewer's), hovering (mouse)
 * or long-pressing (touch) opens the bar where each reaction toggles on its own, so several can be combined. `pickerClassName` adds a smiley button that opens the bar on tap.
 */
export function ReactionTrigger({
  mine,
  onReact,
  children,
  className = "",
  align = "left",
  label = "Reacționează",
  pickerClassName,
  rootClassName = "",
}: {
  mine: ReactionKey[];
  onReact: (next: ReactionKey[]) => void;
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  label?: string;
  pickerClassName?: string;
  rootClassName?: string;
}) {
  const [open, setOpenState] = useState(false);
  const [pos, setPos] = useState<{ top: number; below: boolean; left?: number; right?: number }>({ top: 0, below: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  // The bar is `fixed` so scrollable comment lists can't clip it; it flips under the trigger near the top of the screen.
  const setOpen = (v: boolean) => {
    const r = root.current?.getBoundingClientRect();
    if (v && r) {
      const below = r.top < 90;
      const top = below ? r.bottom + 8 : r.top - 8;
      const vw = window.innerWidth;
      if (align === "right") setPos({ top, below, right: Math.max(8, vw - r.right) });
      else if (align === "center") setPos({ top, below, left: Math.min(Math.max(8, r.left + r.width / 2 - BAR_WIDTH / 2), vw - BAR_WIDTH - 8) });
      else setPos({ top, below, left: Math.min(Math.max(8, r.left), vw - BAR_WIDTH - 8) });
    }
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
    const close = () => setOpenState(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => clear, []);

  // The bar stays open so more reactions can be added; tapping outside closes it.
  const pick = (key: ReactionKey) => {
    clear();
    onReact(sortReactions(toggleReaction(mine, key)));
  };

  return (
    <div
      ref={root}
      className={`relative flex items-center ${rootClassName}`}
      onPointerEnter={(e) => e.pointerType === "mouse" && later(() => setOpen(true), HOVER_OPEN_MS)}
      onPointerLeave={(e) => e.pointerType === "mouse" && later(() => setOpen(false), HOVER_CLOSE_MS)}
    >
      {open && (
        <div
          role="toolbar"
          aria-label="Alege o reacție"
          data-testid="reaction-bar"
          style={{ top: pos.top, left: pos.left, right: pos.right }}
          className={`fixed z-50 flex ${pos.below ? "" : "-translate-y-full"} animate-[pop-in_.16s_ease-out] items-center gap-0.5 rounded-full border border-white/10 bg-carbon/95 p-1.5 shadow-[0_10px_40px_-8px_rgb(0_0_0/0.8),0_0_24px_-6px_rgb(255_106_0/0.5)] backdrop-blur-xl`}
        >
          {REACTIONS.map((r, i) => (
            <button
              key={r.key}
              type="button"
              title={r.label}
              aria-label={r.label}
              aria-pressed={mine.includes(r.key)}
              onClick={() => pick(r.key)}
              style={{ animationDelay: `${i * 25}ms` }}
              className={`grid size-10 animate-[pop-in_.2s_ease-out_both] place-items-center rounded-full text-2xl transition duration-150 hover:-translate-y-1.5 hover:scale-125 ${
                mine.includes(r.key) ? "bg-neon-orange/20 ring-1 ring-neon-orange/50" : "hover:bg-white/5"
              }`}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-label={mine.length ? `Retrage ${mine.length === 1 ? `reacția ${reactionInfo(mine[0]).label}` : "reacțiile"}` : label}
        aria-pressed={mine.length > 0}
        data-reaction={mine.join(" ")}
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
          onReact(mine.length ? [] : [DEFAULT_REACTION]);
        }}
        className={`select-none [-webkit-touch-callout:none] ${className}`}
      >
        {children}
      </button>
      {pickerClassName && (
        <button
          type="button"
          aria-label="Alege o reacție"
          aria-expanded={open}
          data-testid="reaction-picker"
          onClick={() => {
            clear();
            setOpen(!open);
          }}
          className={`select-none ${pickerClassName}`}
        >
          <SmilePlus className="size-5" />
        </button>
      )}
    </div>
  );
}

export type ReactionSource = { kind: "post" | "comment"; id: string };

type Reactor = {
  user_id: string;
  reaction: ReactionKey;
  user: { full_name: string | null; display_name: string | null; avatar_url: string | null; role: AppRole; shown_as_coach?: boolean | null } | null;
};

/** Mini counter pills (❤️ 5 🔥 2), most used first; the viewer's reactions are highlighted. With `source`, tapping them lists who reacted. */
export function ReactionSummary({
  counts,
  mine,
  className = "",
  source,
  hint = false,
}: {
  counts: ReactionCounts;
  mine: ReactionKey[];
  className?: string;
  source?: ReactionSource;
  /** Larger tap target with a "Vezi cine a reacționat" label (post cards). */
  hint?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const entries = REACTIONS.map((r) => ({ ...r, n: counts[r.key] ?? 0 }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);
  if (!entries.length) return null;
  const pills = entries.map((r) => (
    <span
      key={r.key}
      title={r.label}
      data-testid="reaction-pill"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
        mine.includes(r.key) ? "bg-neon-orange/15 text-neon-orange ring-1 ring-neon-orange/40" : "bg-white/[0.06] text-white/75 ring-1 ring-white/10"
      }`}
    >
      <span className="text-sm leading-none">{r.emoji}</span>
      {r.n}
    </span>
  ));
  if (!source) {
    return (
      <div className={`flex flex-wrap gap-1.5 ${className}`} data-testid="reaction-summary">
        {pills}
      </div>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Vezi cine a reacționat"
        data-testid="reaction-summary"
        className={`flex flex-wrap items-center gap-1.5 text-left transition active:scale-95 ${hint ? "min-h-11 rounded-2xl pr-2" : ""} ${className}`}
      >
        {pills}
        {hint && (
          <span className="inline-flex items-center gap-0.5 pl-1 text-xs font-semibold text-white/60">
            Vezi cine a reacționat
            <ChevronRight className="size-3.5" />
          </span>
        )}
      </button>
      {open && <ReactorsSheet source={source} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReactorsSheet({ source, onClose }: { source: ReactionSource; onClose: () => void }) {
  const [supabase] = useState(createClient);
  const [rows, setRows] = useState<Reactor[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<ReactionKey | "all">("all");
  const { kind, id } = source;

  useEffect(() => {
    let active = true;
    const load = (userFields: string) => {
      const fields = `user_id, reaction, created_at, user:users(${userFields})`;
      const query =
        kind === "post"
          ? supabase.from("likes").select(fields).eq("post_id", id)
          : supabase.from("comment_reactions").select(fields).eq("comment_id", id);
      return query.order("created_at", { ascending: false });
    };
    (async () => {
      let res = await load("full_name, display_name, avatar_url, role, shown_as_coach");
      if (res.error) res = await load("full_name, display_name, avatar_url, role");
      if (!active) return;
      if (res.error) setFailed(true);
      else setRows((res.data ?? []) as unknown as Reactor[]);
    })();
    return () => {
      active = false;
    };
  }, [kind, id, supabase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tabs = REACTIONS.map((r) => ({ ...r, n: rows?.filter((x) => x.reaction === r.key).length ?? 0 })).filter((r) => r.n > 0);
  // "Toate" shows each person once, with all of their reactions.
  const list: (Reactor & { reactions: ReactionKey[] })[] = [];
  for (const r of rows ?? []) {
    if (tab !== "all" && r.reaction !== tab) continue;
    const seen = list.find((x) => x.user_id === r.user_id);
    if (seen) seen.reactions.push(r.reaction);
    else list.push({ ...r, reactions: [r.reaction] });
  }
  const tabClass = (active: boolean) =>
    `inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition active:scale-95 ${
      active ? "bg-neon-orange text-onaccent" : "bg-white/[0.06] text-white/75 hover:bg-white/10"
    }`;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Reacții" data-testid="reactors-sheet">
      <button type="button" aria-label="Închide" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-[fade-in_.15s_ease-out] bg-black/70 backdrop-blur-sm" />
      <div className="relative flex max-h-[75svh] w-full max-w-md animate-[sheet-up_.2s_ease-out] flex-col rounded-t-3xl border border-white/10 bg-surface pb-[env(safe-area-inset-bottom)] shadow-neon sm:rounded-3xl sm:pb-0">
        <header className="flex items-center gap-3 px-4 pb-2 pt-3">
          <h2 className="flex-1 font-display text-lg font-black">Reacții</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="grid size-11 place-items-center rounded-xl text-white/60 transition hover:bg-white/5 hover:text-white active:scale-95"
          >
            <X className="size-5" />
          </button>
        </header>
        {rows && rows.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")} className={tabClass(tab === "all")}>
              Toate {rows.length}
            </button>
            {tabs.map((r) => (
              <button key={r.key} type="button" role="tab" aria-selected={tab === r.key} aria-label={`${r.label} ${r.n}`} onClick={() => setTab(r.key)} className={tabClass(tab === r.key)}>
                <span className="text-base leading-none">{r.emoji}</span> {r.n}
              </button>
            ))}
          </div>
        )}
        <ul className="flex-1 overflow-y-auto overscroll-contain border-t border-white/5 pb-2" data-testid="reactors-list">
          {!rows && !failed && (
            <li className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-neon-orange" />
            </li>
          )}
          {failed && <li className="p-6 text-center text-sm text-red-300">Reacțiile nu au putut fi încărcate.</li>}
          {rows && list.length === 0 && <li className="p-6 text-center text-sm text-white/50">Nicio reacție încă.</li>}
          {list.map((r) => {
            const name = r.user?.display_name || r.user?.full_name || "Utilizator";
            return (
              <li key={r.user_id} className="flex items-center gap-3 px-4 py-2.5" data-testid="reactor">
                <Avatar name={name} url={r.user?.avatar_url} className="size-11 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
                <span className="shrink-0 text-lg leading-none tracking-tight" data-testid="reactor-emojis">
                  {sortReactions(r.reactions).map((k) => reactionInfo(k).emoji).join("")}
                </span>
                {r.user && <RoleBadge role={badgeRole(r.user.role, r.user.shown_as_coach)} />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
