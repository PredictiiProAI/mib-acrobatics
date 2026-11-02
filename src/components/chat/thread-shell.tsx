import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Conversation panel: full-screen slide-in with a big back arrow on phones, right pane on desktop. */
export function ThreadShell({
  backHref,
  name,
  subtitle,
  className = "",
  children,
}: {
  backHref: string;
  name: string;
  subtitle: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`glass flex min-h-0 flex-1 flex-col overflow-hidden max-md:-mx-4 max-md:animate-[thread-in_.25s_ease-out] max-md:border-0! md:rounded-3xl ${className}`}
      data-testid="thread"
    >
      <header className="flex items-center gap-3 border-b border-white/5 px-3 py-2.5 md:px-4 md:py-3">
        <Link
          href={backHref}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-neon-orange/10 text-neon-orange transition hover:bg-neon-orange hover:text-onaccent active:scale-95 md:hidden"
          aria-label="Înapoi la conversații"
          data-testid="thread-back"
        >
          <ArrowLeft className="size-6" />
        </Link>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-neon-orange to-neon-green font-black text-onaccent">
          {name[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-xs text-white/50">{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  );
}
