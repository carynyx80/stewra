"use client";

import { forwardRef, useCallback, useRef, type HTMLAttributes, type PointerEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/** Liquid glass panel: a specular rim and glow follow the cursor across its surface. */
export const Glass = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { as?: "div" | "section" | "article" }>(
  function Glass({ className = "", onPointerMove, children, ...rest }, ref) {
    const handle = useCallback(
      (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== "mouse") return onPointerMove?.(e);
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
        onPointerMove?.(e);
      },
      [onPointerMove],
    );
    return (
      <div ref={ref} onPointerMove={handle} className={`glass rounded-2xl ${className}`} {...rest}>
        {children}
      </div>
    );
  },
);

/** Card that tilts slightly toward the cursor, like a floating surface. */
export function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 150, damping: 18 });
  return (
    <motion.div
      ref={ref}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return; // no tilt on touch screens
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      className={className}
    >
      <Glass className="h-full">{children}</Glass>
    </motion.div>
  );
}
