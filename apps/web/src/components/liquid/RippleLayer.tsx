"use client";

import { useEffect } from "react";

/** A soft ring spreads from every click on an interactive element, like a drop landing on water. */
export function RippleLayer() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("button, a, [data-ripple]")) return;
      const ring = document.createElement("span");
      ring.className = "ripple-ring";
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      document.body.appendChild(ring);
      window.setTimeout(() => ring.remove(), 950);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
