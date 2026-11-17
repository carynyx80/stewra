"use client";

import { motion } from "framer-motion";

/** Content rises out of the surface as it scrolls into view. */
export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Headline whose words surface one after another. */
export function LiquidHeadline({ text, highlight, className = "" }: { text: string; highlight?: string; className?: string }) {
  const words = text.split(" ");
  return (
    <h1 className={className}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          className={`mr-[0.25em] inline-block ${highlight && highlight.split(" ").includes(w.replace(/[.,]/g, "")) ? "text-liquid" : ""}`}
          initial={{ opacity: 0, y: "0.6em", filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
        >
          {w}
        </motion.span>
      ))}
    </h1>
  );
}
