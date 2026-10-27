"use client";

import { Check, PersonStanding, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { useState } from "react";

const PILLARS: { key: string; icon: LucideIcon; title: string; tagline: string; benefits: string[] }[] = [
  {
    key: "gym",
    icon: PersonStanding,
    title: "Gimnastică",
    tagline: "Postură corectă, flexibilitate și sănătatea coloanei.",
    benefits: ["Spate drept și musculatură posturală puternică", "Mobilitate articulară și flexibilitate activă", "Obiceiuri sănătoase de mișcare, pentru toată viața"],
  },
  {
    key: "acro",
    icon: Zap,
    title: "Acrobatică Sportivă",
    tagline: "Coordonare spațială, forță, agilitate și curaj.",
    benefits: ["Orientare în spațiu și control al corpului", "Forță de core, brațe și picioare", "Curaj construit pas cu pas, în siguranță"],
  },
  {
    key: "dance",
    icon: Sparkles,
    title: "Dans & Ritm",
    tagline: "Grație, muzicalitate, expresie corporală și creativitate.",
    benefits: ["Simț ritmic și coordonare pe muzică", "Expresivitate și încredere în fața celorlalți", "Creativitate și bucuria mișcării"],
  },
];

export function PillarCards() {
  const [active, setActive] = useState(PILLARS[0].key);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {PILLARS.map(({ key, icon: Icon, title, tagline, benefits }) => {
        const open = active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setActive(key)}
            onMouseEnter={() => setActive(key)}
            aria-expanded={open}
            data-testid="pillar-card"
            className={`group relative overflow-hidden rounded-3xl border p-7 text-left transition duration-300 ${
              open
                ? "-translate-y-1 border-neon-violet/60 bg-gradient-to-b from-neon-violet/20 to-carbon shadow-[0_20px_60px_-25px_rgb(192_132_252/0.8)]"
                : "border-white/10 bg-gradient-to-b from-graphite/80 to-carbon/80 hover:border-neon-violet/30 hover:shadow-neon"
            }`}
          >
            <div className={`pointer-events-none absolute -right-10 -top-10 size-40 rounded-full blur-3xl transition ${open ? "bg-neon-violet/35" : "bg-neon-violet/10"}`} />
            <span className={`grid size-14 place-items-center rounded-2xl ring-1 transition ${open ? "bg-neon-violet text-black ring-neon-violet" : "bg-neon-violet/10 text-neon-violet ring-neon-violet/25"}`}>
              <Icon className="size-7" />
            </span>
            <h3 className="mt-6 font-display text-2xl font-black">{title}</h3>
            <p className="mt-2 text-white/70">{tagline}</p>
            <ul className={`grid transition-all duration-300 ${open ? "mt-5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <li className="space-y-2.5 overflow-hidden">
                {benefits.map((b) => (
                  <p key={b} className="flex items-start gap-2.5 text-sm text-white/80">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-neon-violet/20 text-neon-violet">
                      <Check className="size-3.5" />
                    </span>
                    {b}
                  </p>
                ))}
              </li>
            </ul>
          </button>
        );
      })}
    </div>
  );
}
