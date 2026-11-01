"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { GalleryImage } from "@/lib/about";

export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const step = (d: number) => setOpen((i) => (i === null ? i : (i + d + images.length) % images.length));

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpen(i)}
            className={`group relative overflow-hidden rounded-2xl bg-graphite ring-1 ring-white/10 transition hover:ring-neon-orange/60 hover:shadow-neon ${
              i === 0 && images.length > 2 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
            }`}
            aria-label={`Deschide fotografia ${i + 1}`}
            data-testid="gallery-photo"
          >
            <Image src={img.image_url} alt={`Sala MIB Acrobatics, fotografia ${i + 1}`} fill sizes="(min-width: 1024px) 300px, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />
          </button>
        ))}
      </div>

      {open !== null && images[open] && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Galerie Foto" onClick={() => setOpen(null)}>
          <div className="relative h-[80svh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Image src={images[open].image_url} alt={`Sala MIB Acrobatics, fotografia ${open + 1}`} fill sizes="100vw" className="object-contain" />
          </div>
          <button type="button" onClick={() => setOpen(null)} aria-label="Închide" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="size-6" />
          </button>
          {images.length > 1 && (
            <>
              <button type="button" onClick={(e) => (e.stopPropagation(), step(-1))} aria-label="Fotografia anterioară" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-neon-orange hover:text-black">
                <ChevronLeft className="size-6" />
              </button>
              <button type="button" onClick={(e) => (e.stopPropagation(), step(1))} aria-label="Fotografia următoare" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-neon-orange hover:text-black">
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
