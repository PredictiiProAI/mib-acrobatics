"use client";

import { ArrowLeft, Search, SquarePen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DirectoryMember } from "@/lib/messages";

/** "Mesaj nou": searchable list of the coach and club members to start a private chat with. */
export function NewMessage({ members, coachName }: { members: DirectoryMember[]; coachName: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const q = query.trim().toLowerCase();
  const list = q ? members.filter((m) => m.name.toLowerCase().includes(q)) : members;
  const showCoach = coachName && (!q || coachName.toLowerCase().includes(q) || "antrenor".includes(q));

  function start(slug: string) {
    setOpen(false);
    setQuery("");
    router.push(`/messages/${slug}`);
  }

  const row = "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5 active:bg-white/10";
  const avatar = "grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neon-orange to-neon-green font-black text-onaccent";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-neon-orange px-3 text-sm font-bold text-onaccent transition hover:brightness-110 active:scale-95"
        data-testid="new-message"
      >
        <SquarePen className="size-4" /> Mesaj nou
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-sm md:items-center md:p-6" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mesaj nou"
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full flex-col overflow-hidden bg-surface pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] animate-[thread-in_.25s_ease-out] md:h-[min(36rem,85svh)] md:max-w-md md:rounded-3xl md:border md:border-white/10 md:pt-0 md:pb-0 md:animate-[pop-in_.2s_ease-out]"
            data-testid="new-message-sheet"
          >
            <header className="flex items-center gap-3 border-b border-white/5 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-neon-orange/10 text-neon-orange transition hover:bg-neon-orange hover:text-onaccent active:scale-95"
                aria-label="Înapoi"
              >
                <ArrowLeft className="size-6" />
              </button>
              <h2 className="font-display text-lg font-black">Mesaj nou</h2>
            </header>
            <div className="border-b border-white/5 p-3">
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm focus-within:border-neon-orange/70">
                <Search className="size-4 text-white/40" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Caută un membru…"
                  className="w-full bg-transparent outline-none placeholder:text-white/30"
                />
              </label>
            </div>
            <ul className="flex-1 overflow-y-auto" data-testid="member-directory">
              {showCoach && (
                <li>
                  <button type="button" onClick={() => start("antrenor")} className={row}>
                    <span className={avatar}>{coachName[0]?.toUpperCase()}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{coachName}</span>
                      <span className="block text-[11px] uppercase text-neon-green">Antrenor</span>
                    </span>
                  </button>
                </li>
              )}
              {list.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => start(m.id)} className={row}>
                    <span className={avatar}>{m.name[0]?.toUpperCase()}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{m.name}</span>
                      <span className="block text-xs text-white/50">{m.accountType ?? "Membru"}</span>
                    </span>
                  </button>
                </li>
              ))}
              {!showCoach && list.length === 0 && <li className="p-6 text-center text-sm text-white/50">Niciun membru găsit.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
