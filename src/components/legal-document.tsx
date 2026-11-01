import { Mail } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BackButton } from "@/components/back-button";
import { Logo } from "@/components/logo";
import { LEGAL_CONTACT_EMAIL, type LegalSection } from "@/lib/legal";

const TOKEN = /\[([^\]]+)\]\(([^)]+)\)|([\w.+-]+@[\w-]+\.[\w.]+)/g;
const linkClass = "font-semibold text-neon-orange underline-offset-4 hover:text-neon-green hover:underline";

/** Plain text with `[label](href)` links and clickable email addresses. */
function Paragraph({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    out.push(text.slice(last, m.index));
    out.push(
      m[3] ? (
        <a key={m.index} href={`mailto:${m[3]}`} className={linkClass}>
          {m[3]}
        </a>
      ) : (
        <Link key={m.index} href={m[2]} className={linkClass}>
          {m[1]}
        </Link>
      ),
    );
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}

export function LegalDocument({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <Logo href="/" />
        <BackButton fallback="/" />
      </div>

      <header className="mt-8 border-b border-neon-orange/30 pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-neon-green">Document legal · AcroMIB</p>
        <h1 className="mt-2 font-display text-3xl font-black text-white sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-white/50">Ultima actualizare: {updated}</p>
        <p className="mt-5 text-[15px] leading-relaxed text-white/80">
          <Paragraph text={intro} />
        </p>
      </header>

      <nav aria-label="Cuprins" className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm font-bold text-white">Cuprins</p>
        <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-white/65 transition hover:text-neon-orange">
                <span className="text-neon-green">{i + 1}.</span> {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 space-y-9">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold text-neon-orange">
              {i + 1}. {s.title}
            </h2>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-white/80">
              {s.body.map((block, j) =>
                typeof block === "string" ? (
                  <p key={j}>
                    <Paragraph text={block} />
                  </p>
                ) : (
                  <ul key={j} className="space-y-2 pl-1">
                    {block.list.map((item, k) => (
                      <li key={k} className="flex gap-3">
                        <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-neon-green" aria-hidden />
                        <span>
                          <Paragraph text={item} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ),
              )}
            </div>
          </section>
        ))}
      </div>

      <aside className="mt-12 flex flex-col items-start gap-3 rounded-2xl border border-neon-orange/40 bg-neon-orange/[0.06] p-5 sm:flex-row sm:items-center">
        <Mail className="size-6 shrink-0 text-neon-orange" />
        <p className="text-sm text-white/80">
          Întrebări sau cereri privind datele tale? Scrie-ne la <Paragraph text={LEGAL_CONTACT_EMAIL} />.
        </p>
      </aside>

      <div className="mt-8 flex justify-center">
        <BackButton fallback="/" />
      </div>
    </main>
  );
}
