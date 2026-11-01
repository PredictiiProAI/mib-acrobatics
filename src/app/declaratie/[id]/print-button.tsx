"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-2xl bg-neon-orange px-4 py-2.5 text-sm font-bold text-black transition hover:bg-neon-green"
      data-testid="waiver-print"
    >
      <Printer className="size-4" /> Printează / Salvează PDF
    </button>
  );
}
