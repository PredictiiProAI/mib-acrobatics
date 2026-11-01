import { FileText } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { Logo } from "@/components/logo";

export function LegalPlaceholder({ title }: { title: string }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Logo href="/" />
        <BackButton fallback="/" />
      </div>
      <section className="glass mt-10 rounded-3xl border border-neon-orange/40 p-8 text-center">
        <FileText className="mx-auto size-10 text-neon-orange" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-neon-green">Document legal</p>
        <h1 className="mt-2 font-display text-3xl font-black text-white">{title}</h1>
        <p className="mt-4 text-white/60">Conținutul va fi adăugat curând.</p>
      </section>
    </main>
  );
}
