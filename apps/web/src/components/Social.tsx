export const X_URL = "https://x.com/Stewraxyz";
export const X_HANDLE = "@Stewraxyz";

export function XLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Link to Stewra on X. `variant="icon"` for headers, `"pill"` for footers. */
export function XLink({ variant = "icon", className = "" }: { variant?: "icon" | "pill" | "text"; className?: string }) {
  if (variant === "pill") {
    return (
      <a
        href={X_URL}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-3 py-2 text-sm text-mist transition hover:border-lime/40 hover:text-frost ${className}`}
      >
        <XLogo className="h-3.5 w-3.5" /> Follow {X_HANDLE}
      </a>
    );
  }
  if (variant === "text") {
    return (
      <a href={X_URL} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-2 hover:text-frost ${className}`}>
        <XLogo className="h-3.5 w-3.5" /> X (Twitter)
      </a>
    );
  }
  return (
    <a
      href={X_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={`Stewra on X (${X_HANDLE})`}
      title={`${X_HANDLE} on X`}
      className={`flex h-9 w-9 items-center justify-center rounded-xl text-mist transition hover:bg-white/[0.06] hover:text-frost ${className}`}
    >
      <XLogo className="h-4 w-4" />
    </a>
  );
}
