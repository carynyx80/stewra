"use client";

import Link from "next/link";
import { forwardRef, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { statusLabel } from "@/lib/format";

/* ---------------------------------------------------------------- Button */

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-lime text-void hover:bg-lime-hi font-semibold shadow-[0_0_0_1px_rgba(196,232,66,0.4),0_10px_40px_-12px_rgba(182,218,52,0.55)]",
  secondary: "bg-white/[0.04] text-frost border border-line-strong hover:bg-white/[0.08]",
  ghost: "text-mist hover:text-frost hover:bg-white/[0.05]",
  danger: "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  href?: string;
}

/**
 * Liquid button: a soft blob of light follows the pointer inside the button,
 * so the surface reacts like a liquid under your finger.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, href, className = "", children, disabled, ...rest },
  ref,
) {
  const blobX = useSpring(useMotionValue(-100), { stiffness: 300, damping: 30 });
  const blobY = useSpring(useMotionValue(-100), { stiffness: 300, damping: 30 });
  const sizes = { sm: "h-9 sm:h-8 px-3 text-[13px] rounded-lg", md: "h-11 sm:h-10 px-4 text-sm rounded-xl", lg: "h-12 px-6 text-[15px] rounded-2xl" };
  const cls = `group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`;
  const inner = (
    <>
      <motion.span
        aria-hidden
        className={`pointer-events-none absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${variant === "primary" ? "bg-white/50" : "bg-lime/25"}`}
        style={{ left: blobX, top: blobY }}
      />
      <span className="relative inline-flex items-center gap-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </span>
    </>
  );
  const move = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    blobX.set(e.clientX - r.left);
    blobY.set(e.clientY - r.top);
  };
  if (href) {
    return (
      <Link href={href} className={cls} onPointerMove={move}>
        {inner}
      </Link>
    );
  }
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} onPointerMove={move} {...rest}>
      {inner}
    </button>
  );
});

/* ----------------------------------------------------------------- Inputs */

const fieldCls =
  "w-full rounded-xl border border-line bg-black/30 px-3.5 py-2.5 text-sm text-frost placeholder:text-dim outline-none transition focus:border-lime/60 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(182,218,52,0.12)]";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className = "", ...p }, ref) {
  return <input ref={ref} className={`${fieldCls} h-11 sm:h-10 ${className}`} {...p} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className = "", ...p }, ref) {
  return <textarea ref={ref} className={`${fieldCls} min-h-28 resize-y leading-relaxed ${className}`} {...p} />;
});
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className = "", children, ...p }, ref) {
  return (
    <select ref={ref} className={`${fieldCls} h-11 sm:h-10 appearance-none ${className}`} {...p}>
      {children}
    </select>
  );
});

export function Field({ label, hint, children, className = "" }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-mist">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-dim">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-sm text-mist">
      <span className={`relative h-6 w-11 rounded-full border transition ${checked ? "border-lime/60 bg-lime/25" : "border-line-strong bg-white/5"}`}>
        <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className={`absolute top-0.5 h-[18px] w-[18px] rounded-full ${checked ? "right-0.5 bg-lime" : "left-0.5 bg-mist"}`} />
      </span>
      {label}
    </button>
  );
}

/* ----------------------------------------------------------------- Status */

const tone: Record<string, string> = {
  COMPLETED: "text-lime bg-lime/10 border-lime/25",
  ACCEPTED: "text-lime bg-lime/10 border-lime/25",
  APPROVED: "text-lime bg-lime/10 border-lime/25",
  ACTIVE: "text-lime bg-lime/10 border-lime/25",
  IDLE: "text-mist bg-white/5 border-line-strong",
  RUNNING: "text-info bg-info/10 border-info/25",
  IN_PROGRESS: "text-info bg-info/10 border-info/25",
  FUNDED: "text-info bg-info/10 border-info/25",
  DELIVERED: "text-info bg-info/10 border-info/25",
  QUEUED: "text-mist bg-white/5 border-line-strong",
  PLANNING: "text-mist bg-white/5 border-line-strong",
  WAITING_ON_DEPENDENCY: "text-warn bg-warn/10 border-warn/25",
  PENDING_APPROVAL: "text-warn bg-warn/10 border-warn/25",
  PENDING: "text-warn bg-warn/10 border-warn/25",
  AWAITING_FUNDING: "text-warn bg-warn/10 border-warn/25",
  CHANGES_REQUESTED: "text-warn bg-warn/10 border-warn/25",
  PAUSED: "text-warn bg-warn/10 border-warn/25",
  FAILED: "text-danger bg-danger/10 border-danger/25",
  REJECTED: "text-danger bg-danger/10 border-danger/25",
  DISPUTED: "text-danger bg-danger/10 border-danger/25",
  CANCELLED: "text-dim bg-white/5 border-line",
  EXPIRED: "text-dim bg-white/5 border-line",
  REFUNDED: "text-dim bg-white/5 border-line",
};

export function StatusPill({ status }: { status: string }) {
  const live = ["RUNNING", "IN_PROGRESS"].includes(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${tone[status] ?? "text-mist bg-white/5 border-line"}`}>
      {live && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {statusLabel(status)}
    </span>
  );
}

export function Badge({ children, tone: t = "neutral" }: { children: ReactNode; tone?: "neutral" | "lime" | "warn" | "info" | "danger" }) {
  const map = {
    neutral: "text-mist bg-white/5 border-line",
    lime: "text-lime bg-lime/10 border-lime/25",
    warn: "text-warn bg-warn/10 border-warn/25",
    info: "text-info bg-info/10 border-info/25",
    danger: "text-danger bg-danger/10 border-danger/25",
  };
  return <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${map[t]}`}>{children}</span>;
}

/* ------------------------------------------------------------ Page states */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.05] ${className}`} />;
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/[0.06] p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
      <div className="flex-1">
        <p className="text-frost">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 text-xs font-medium text-lime hover:underline">
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export function Empty({ title, body, action, icon }: { title: string; body?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-white/[0.03] text-mist">{icon ?? <Inbox className="h-5 w-5" />}</div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {body && <p className="mt-1.5 max-w-md text-sm text-mist">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ tone: t = "info", children }: { tone?: "info" | "warn" | "lime"; children: ReactNode }) {
  const map = { info: "border-info/25 bg-info/[0.06]", warn: "border-warn/25 bg-warn/[0.06]", lime: "border-lime/25 bg-lime/[0.06]" };
  return <div className={`rounded-2xl border px-4 py-3 text-sm text-frost ${map[t]}`}>{children}</div>;
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-stewra text-[15px]">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, body, action }: { eyebrow?: string; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-lime">{eyebrow}</p>}
        <h1 className="font-display text-[22px] font-semibold leading-tight tracking-tight sm:text-2xl md:text-[28px]">{title}</h1>
        {body && <p className="mt-1.5 max-w-2xl text-sm text-mist">{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="glass rounded-2xl p-4">
      <p className="text-xs text-mist">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-dim">{sub}</p>}
    </div>
  );
}
