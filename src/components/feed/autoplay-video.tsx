"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Plays muted while at least 60% visible, pauses when scrolled away. */
export function AutoplayVideo({ src, onDoubleClick }: { src: string; onDoubleClick?: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative size-full">
      <video
        ref={ref}
        src={src}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onDoubleClick={onDoubleClick}
        className="size-full object-cover"
      />
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Pornește sunetul" : "Oprește sunetul"}
        className="absolute bottom-3 right-3 rounded-full bg-black/60 p-2 text-white backdrop-blur transition hover:bg-black/80"
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
    </div>
  );
}
