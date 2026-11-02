"use client";

import { Volume2, VolumeX } from "lucide-react";
import { type MouseEvent, useEffect, useRef, useState } from "react";

// Only one feed video plays sound at a time.
let audible: HTMLVideoElement | null = null;

/** Plays muted while at least 60% visible, pauses when scrolled away. */
export function AutoplayVideo({ src, onDoubleClick }: { src: string; onDoubleClick?: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(video);
    return () => {
      observer.disconnect();
      if (audible === video) audible = null;
    };
  }, []);

  // The muted state lives on the element (set synchronously inside the tap, which mobile browsers require
  // to allow sound); React state only mirrors it through the volumechange event.
  function toggleSound(e: MouseEvent) {
    e.stopPropagation();
    const video = ref.current;
    if (!video) return;
    if (!video.muted) {
      video.muted = true;
      return;
    }
    if (audible && audible !== video) audible.muted = true;
    audible = video;
    video.muted = false;
    video.play().catch(() => {
      // Sound refused by the browser: keep the clip running silently instead of leaving it frozen.
      video.muted = true;
      video.play().catch(() => {});
    });
  }

  return (
    <div className="relative size-full">
      <video
        ref={ref}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        onDoubleClick={onDoubleClick}
        className="size-full object-cover"
      />
      <button
        type="button"
        onClick={toggleSound}
        onDoubleClick={(e) => e.stopPropagation()}
        aria-label={muted ? "Pornește sunetul" : "Oprește sunetul"}
        aria-pressed={!muted}
        className="theme-dark absolute bottom-3 right-3 z-10 rounded-full bg-black/60 p-3 text-white backdrop-blur transition hover:bg-black/80"
      >
        {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>
    </div>
  );
}
