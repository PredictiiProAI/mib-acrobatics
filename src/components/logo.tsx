import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2 font-display text-lg font-black tracking-wider">
      <span className="grid size-9 place-items-center rounded-xl bg-neon-orange/15 text-neon-orange glow-orange transition group-hover:scale-105">
        M
      </span>
      <span>
        MIB<span className="text-neon-green">.</span>
        <span className="ml-1 text-xs font-semibold tracking-[0.3em] text-white/60">ACROBATICS</span>
      </span>
    </Link>
  );
}
