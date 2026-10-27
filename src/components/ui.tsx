import Link from "next/link";
import type { ComponentProps } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:pointer-events-none";

const variants = {
  primary: "bg-neon-violet text-white font-bold shadow-neon hover:shadow-neon-lg hover:brightness-110",
  accent: "bg-neon-purple text-white font-bold shadow-neon hover:shadow-neon-lg hover:brightness-110",
  ghost: "glass text-white hover:border-neon-violet/50 hover:shadow-neon-sm",
};

type Variant = keyof typeof variants;

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-neon-violet/70 focus:ring-2 focus:ring-neon-violet/20 ${className}`}
      {...props}
    />
  );
}
