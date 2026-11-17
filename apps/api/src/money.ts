/** Token amount helpers. Amounts are base-unit decimal strings, handled as BigInt. */

export function toUnits(amount: string, decimals: number): string {
  const s = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`Invalid amount: ${amount}`);
  const [whole, frac = ""] = s.split(".");
  if (frac.length > decimals) throw new Error(`Too many decimal places (max ${decimals})`);
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0") || "0")).toString();
}

export function fromUnits(units: string | bigint, decimals: number): string {
  const v = BigInt(units);
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

export function sumUnits(values: string[]): bigint {
  return values.reduce((acc, v) => acc + BigInt(v), 0n);
}
