"use client";

import { useEffect } from "react";
import type { SeenSection } from "./seen";
import { markSectionSeen } from "./seen-actions";

/** Rendered inside a badged section: opening it marks the section as seen. */
export function MarkSeen({ section }: { section: SeenSection }) {
  useEffect(() => {
    void markSectionSeen(section);
  }, [section]);
  return null;
}
