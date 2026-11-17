export function fromUnits(units: string | bigint | null | undefined, decimals: number, maxFrac = 4): string {
  if (units === null || units === undefined) return "—";
  const v = BigInt(units);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, "0").slice(0, maxFrac).replace(/0+$/, "");
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${wholeStr}${frac ? `.${frac}` : ""}`;
}

export const usd = (micros: number) =>
  micros === 0
    ? "$0.00"
    : micros < 10_000
      ? "<$0.01"
      : `$${(micros / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const shortAddr = (a?: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

export function timeAgo(d: string | Date) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${Math.max(s, 0)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const fmtDate = (d: string | Date) => new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export const statusLabel = (s: string) => s.toLowerCase().replace(/_/g, " ");
