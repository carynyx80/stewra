import { useId } from "react";

/** The Stewra mark: two arcs forming an S, cut on a shared 10° slant (owner hands authority to the workforce). */
export function Mark({ size = 28, className = "", glow = false }: { size?: number; className?: string; glow?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size * (32 / 56)} height={size} viewBox="16 4 32 56" className={className} aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="4" x2="0" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#C4E842" />
          <stop offset="1" stopColor="#8CB41E" />
        </linearGradient>
        {glow && (
          <filter id={`f${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        )}
      </defs>
      {glow && (
        <g filter={`url(#f${id})`} opacity="0.55">
          <path d={TOP} fill="#8CB41E" />
          <path d={BOTTOM} fill="#8CB41E" />
        </g>
      )}
      <path d={TOP} fill={`url(#g${id})`} />
      <path d={BOTTOM} fill={`url(#g${id})`} />
    </svg>
  );
}

const TOP = "M29.222 35.757 A16 16 0 1 1 47.985 20.703 L39.968 19.289 A8 8 0 1 0 30.611 27.878 Z";
const BOTTOM = "M34.778 28.243 A16 16 0 1 1 16.015 43.297 L24.032 44.711 A8 8 0 1 0 33.389 36.122 Z";

export function Logo({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={size} />
      <span className="font-display text-[1.15rem] font-semibold tracking-tight text-frost" style={{ fontSize: size * 0.72 }}>
        stewra
      </span>
    </span>
  );
}
