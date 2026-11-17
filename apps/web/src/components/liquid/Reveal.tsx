/**
 * Content rises out of the surface as it scrolls into view.
 * Pure CSS (scroll-driven animation): content is always visible without JavaScript,
 * and browsers without scroll timelines simply show it immediately.
 */
export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <div className={`reveal ${className}`} style={delay ? ({ "--reveal-delay": `${Math.round(delay * 100)}px` } as React.CSSProperties) : undefined}>
      {children}
    </div>
  );
}

/** Headline whose words surface one after another, via CSS so it paints before hydration. */
export function LiquidHeadline({ text, highlight, className = "" }: { text: string; highlight?: string; className?: string }) {
  const marks = new Set((highlight ?? "").split(" ").filter(Boolean));
  return (
    <h1 className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className={`word-rise mr-[0.25em] inline-block ${marks.has(w.replace(/[.,]/g, "")) ? "text-liquid" : ""}`} style={{ animationDelay: `${0.06 * i}s` }}>
          {w}
        </span>
      ))}
    </h1>
  );
}
