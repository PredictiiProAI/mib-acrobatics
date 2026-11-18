"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui";

type Child = { name: string; age: string };

const MAX_CHILDREN = 10;
const MAX_LENGTH = 300;

function parse(value: string): Child[] {
  const rows = value
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(.*?)[\s,(]+(\d{1,2})\s*(?:ani|an)?\)?$/i);
      return m ? { name: m[1].trim(), age: m[2] } : { name: s, age: "" };
    });
  return rows.length ? rows : [{ name: "", age: "" }];
}

const serialize = (rows: Child[]) =>
  rows
    .filter((c) => c.name.trim())
    .map((c) => (c.age ? `${c.name.trim()}, ${c.age} ${c.age === "1" ? "an" : "ani"}` : c.name.trim()))
    .join("; ");

/** Name + age rows for a parent's children, stored as "Nume, 9 ani; Nume, 12 ani". */
export function ChildrenInput({
  defaultValue,
  name,
  onChange,
  inputClassName = "",
}: {
  defaultValue: string;
  name?: string;
  onChange?: (value: string) => void;
  inputClassName?: string;
}) {
  const [rows, setRows] = useState(() => parse(defaultValue));
  const value = serialize(rows);
  const update = (next: Child[]) => {
    setRows(next);
    onChange?.(serialize(next));
  };
  const edit = (i: number, patch: Partial<Child>) => update(rows.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-2" data-testid="children-input">
      {name && <input type="hidden" name={name} value={value} />}
      {rows.map((c, i) => (
        <div key={i} className="flex items-center gap-2" data-testid="child-row">
          <Input
            value={c.name}
            onChange={(e) => edit(i, { name: e.target.value.replace(/[;]/g, "") })}
            maxLength={60}
            placeholder={`Numele copilului ${i + 1}`}
            aria-label={`Numele copilului ${i + 1}`}
            className={`min-w-0 flex-1 ${inputClassName}`}
            data-testid="child-name"
          />
          <Input
            value={c.age}
            onChange={(e) => edit(i, { age: e.target.value.replace(/\D/g, "").slice(0, 2) })}
            inputMode="numeric"
            placeholder="Vârsta"
            aria-label={`Vârsta copilului ${i + 1}`}
            className={`w-20 shrink-0 text-center ${inputClassName}`}
            data-testid="child-age"
          />
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => update(rows.filter((_, j) => j !== i))}
              aria-label={`Șterge copilul ${i + 1}`}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/60 transition hover:border-red-400/60 hover:text-red-300"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      ))}
      {rows.length < MAX_CHILDREN && value.length < MAX_LENGTH - 20 && (
        <button
          type="button"
          onClick={() => update([...rows, { name: "", age: "" }])}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-neon-green/50 px-3 py-1.5 text-xs font-semibold text-neon-green transition hover:bg-neon-green/10"
          data-testid="add-child"
        >
          <Plus className="size-3.5" /> Adaugă copil
        </button>
      )}
    </div>
  );
}
