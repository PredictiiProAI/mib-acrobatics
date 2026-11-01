"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

/** Mobile "Înapoi": history back when possible, otherwise the fallback route. */
export function BackButton({ fallback, className = "" }: { fallback: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      data-testid="back-button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-neon-orange/50 hover:text-neon-orange ${className}`}
    >
      <ArrowLeft className="size-4" /> Înapoi
    </button>
  );
}

/** Dashboard sub-pages on mobile (conversations have their own back arrow). */
export function DashboardBack() {
  const pathname = usePathname();
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/messages/")) return null;
  return <BackButton fallback="/dashboard" className="mb-5 md:hidden" />;
}
