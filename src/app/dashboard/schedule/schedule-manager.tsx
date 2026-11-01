"use client";

import { Clock, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useConfirm } from "@/components/confirm-dialog";
import { deleteScheduleEntry, saveScheduleEntry, type ScheduleInput } from "@/lib/actions/schedule";
import {
  BADGE_COLORS,
  BADGE_STYLE,
  DAYS,
  dayLabel,
  groupSchedule,
  hhmm,
  LEVEL_LABEL,
  LEVELS,
  sortSchedule,
  type ScheduleRow,
} from "@/lib/schedule";

const EMPTY: ScheduleInput = {
  group_name: "",
  age_range: "",
  day_of_week: 1,
  start_time: "17:00",
  end_time: "18:00",
  level: "all",
  badge_color: "violet",
  notes: "",
  sort_order: 0,
};

const toInput = (r: ScheduleRow): ScheduleInput => ({
  id: r.id,
  group_name: r.group_name,
  age_range: r.age_range ?? "",
  day_of_week: r.day_of_week,
  start_time: hhmm(r.start_time),
  end_time: hhmm(r.end_time),
  level: r.level,
  badge_color: r.badge_color,
  notes: r.notes ?? "",
  sort_order: r.sort_order,
});

const field = "w-full rounded-xl border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-neon-violet/70 focus:shadow-neon-sm";

export function ScheduleManager({ rows }: { rows: ScheduleRow[] }) {
  const [editing, setEditing] = useState<ScheduleInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirm, confirmDialog] = useConfirm();
  const groups = useMemo(() => groupSchedule(rows), [rows]);
  const byDay = useMemo(() => DAYS.map((_, i) => sortSchedule(rows).filter((r) => r.day_of_week === i + 1)), [rows]);

  async function remove(r: ScheduleRow) {
    const ok = await confirm({
      title: "Ștergi această oră?",
      description: `${r.group_name} · ${dayLabel(r.day_of_week)} ${hhmm(r.start_time)}–${hhmm(r.end_time)} va dispărea din program.`,
      confirmLabel: "Șterge",
    });
    if (!ok) return;
    startTransition(async () => {
      setError(null);
      const res = await deleteScheduleEntry(r.id);
      if (!res.ok) setError(res.error);
    });
  }

  const newForGroup = (g?: (typeof groups)[number], day?: number) =>
    setEditing({
      ...EMPTY,
      ...(g ? { group_name: g.name, age_range: g.ageRange ?? "", level: g.level, badge_color: g.color, sort_order: g.sortOrder } : {}),
      ...(day ? { day_of_week: day } : {}),
    });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => newForGroup()}
          className="inline-flex items-center gap-2 rounded-xl bg-neon-violet px-5 py-2.5 text-sm font-bold text-white shadow-neon transition hover:shadow-neon-lg"
        >
          <Plus className="size-4" /> Adaugă oră
        </button>
        <span className="text-sm text-white/50">
          {rows.length} ore · {groups.length} grupe
        </span>
        {pending && <Loader2 className="size-4 animate-spin text-neon-violet" />}
        {error && <span className="text-sm text-red-300">{error}</span>}
      </div>

      <section>
        <h2 className="font-display text-lg font-extrabold">Calendar săptămânal</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7" data-testid="week-calendar">
          {byDay.map((list, i) => (
            <div key={DAYS[i]} className="glass flex min-h-40 flex-col rounded-2xl p-3" data-testid="day-column">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-bold">{DAYS[i]}</span>
                <button
                  type="button"
                  onClick={() => newForGroup(undefined, i + 1)}
                  aria-label={`Adaugă oră ${DAYS[i]}`}
                  className="rounded-lg p-1 text-white/40 transition hover:bg-neon-violet/15 hover:text-neon-violet"
                >
                  <Plus className="size-4" />
                </button>
              </div>
              <ul className="flex-1 space-y-2">
                {list.length === 0 && <li className="px-1 py-4 text-center text-xs text-white/30">Liber</li>}
                {list.map((r) => (
                  <li key={r.id} className="group relative rounded-xl border border-white/10 bg-black/40 p-2.5 transition hover:border-neon-violet/50 hover:shadow-neon-sm" data-testid="calendar-entry">
                    <button type="button" onClick={() => setEditing(toInput(r))} className="block w-full text-left" aria-label={`Editează ${r.group_name} ${DAYS[i]}`}>
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/60">
                        <Clock className="size-3" /> {hhmm(r.start_time)}–{hhmm(r.end_time)}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5">
                        <span className={`size-2 shrink-0 rounded-full ${BADGE_STYLE[r.badge_color].dot}`} />
                        <span className="truncate text-sm font-semibold">{r.group_name}</span>
                      </span>
                      {r.age_range && <span className="block truncate text-[11px] text-white/45">{r.age_range}</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      aria-label={`Șterge ${r.group_name} ${DAYS[i]}`}
                      className="absolute right-1.5 top-1.5 rounded-lg p-1 text-white/30 transition hover:bg-red-500/10 hover:text-red-300 lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-extrabold">Grupe</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <div key={g.name} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{g.name}</p>
                  <p className="text-xs text-white/50">
                    {LEVEL_LABEL[g.level]} · {g.sessions.length} {g.sessions.length === 1 ? "oră" : "ore"} / săptămână
                  </p>
                </div>
                {g.ageRange && <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${BADGE_STYLE[g.color].badge}`}>{g.ageRange}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {g.sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setEditing(toInput(s))}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-xs text-white/75 hover:bg-neon-violet/15 hover:text-white"
                  >
                    <Pencil className="size-3" /> {dayLabel(s.day_of_week).slice(0, 3)} {hhmm(s.start_time)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => newForGroup(g)}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-neon-violet/40 px-2 py-1 text-xs font-semibold text-neon-violet hover:bg-neon-violet/10"
                >
                  <Plus className="size-3" /> Oră nouă
                </button>
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="text-sm text-white/50">Nicio grupă încă. Adaugă prima oră de antrenament.</p>}
        </div>
      </section>

      {editing && <EntryForm initial={editing} groupNames={groups.map((g) => g.name)} groups={groups} onClose={() => setEditing(null)} />}
      {confirmDialog}
    </div>
  );
}

function EntryForm({
  initial,
  groupNames,
  groups,
  onClose,
}: {
  initial: ScheduleInput;
  groupNames: string[];
  groups: ReturnType<typeof groupSchedule>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof ScheduleInput>(key: K, value: ScheduleInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Picking an existing group copies its age range, level and colour.
  function pickGroup(name: string) {
    const g = groups.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
    setForm((f) => ({ ...f, group_name: name, ...(g && !f.id ? { age_range: g.ageRange ?? "", level: g.level, badge_color: g.color, sort_order: g.sortOrder } : {}) }));
  }

  function submit() {
    startTransition(async () => {
      setError(null);
      const res = await saveScheduleEntry(form);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={form.id ? "Editează ora" : "Adaugă oră"} data-testid="schedule-form">
      <button type="button" aria-label="Închide" tabIndex={-1} onClick={onClose} className="absolute inset-0 animate-[fade-in_.15s_ease-out] bg-black/80 backdrop-blur-sm" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative max-h-[92svh] w-full max-w-lg animate-[sheet-up_.2s_ease-out] overflow-y-auto rounded-3xl border border-neon-violet/40 bg-carbon/95 p-6 shadow-neon backdrop-blur-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold">{form.id ? "Editează ora" : "Adaugă oră"}</h2>
          <button type="button" onClick={onClose} aria-label="Închide" className="rounded-full p-1.5 text-white/60 hover:bg-white/5 hover:text-white">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-white/60">Grupă</span>
            <input required list="schedule-groups" value={form.group_name} onChange={(e) => pickGroup(e.target.value)} placeholder="ex. Mini Acro" maxLength={80} className={field} name="group_name" />
            <datalist id="schedule-groups">
              {groupNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-white/60">Vârstă</span>
            <input value={form.age_range} onChange={(e) => set("age_range", e.target.value)} placeholder="ex. 5–7 ani" maxLength={40} className={field} name="age_range" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-white/60">Ziua</span>
            <select value={form.day_of_week} onChange={(e) => set("day_of_week", Number(e.target.value))} className={field} name="day_of_week">
              {DAYS.map((d, i) => (
                <option key={d} value={i + 1} className="bg-graphite">
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-white/60">Început</span>
            <input required type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} className={field} name="start_time" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-white/60">Final</span>
            <input required type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} className={field} name="end_time" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-white/60">Nivel</span>
            <select value={form.level} onChange={(e) => set("level", e.target.value as ScheduleInput["level"])} className={field} name="level">
              {LEVELS.map((l) => (
                <option key={l} value={l} className="bg-graphite">
                  {LEVEL_LABEL[l]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-white/60">Ordine afișare</span>
            <input type="number" value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} className={field} name="sort_order" />
          </label>
          <div className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-white/60">Culoare etichetă</span>
            <div className="flex flex-wrap gap-2">
              {BADGE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("badge_color", c)}
                  aria-pressed={form.badge_color === c}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 transition ${BADGE_STYLE[c].badge} ${form.badge_color === c ? "scale-105 shadow-neon-sm ring-2" : "opacity-60 hover:opacity-100"}`}
                >
                  <span className={`size-2 rounded-full ${BADGE_STYLE[c].dot}`} /> {BADGE_STYLE[c].label}
                </button>
              ))}
            </div>
          </div>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-semibold text-white/60">Notă (opțional)</span>
            <input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="ex. sala mare" maxLength={200} className={field} name="notes" />
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/80 hover:border-white/25 hover:text-white">
            Anulează
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neon-violet px-5 py-2.5 text-sm font-bold text-white shadow-neon transition hover:shadow-neon-lg disabled:opacity-60"
          >
            {pending && <Loader2 className="size-4 animate-spin" />} Salvează
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
