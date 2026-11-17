/**
 * Configurable fee engine. The platform fee is a basis-point rate set by
 * PLATFORM_FEE_BPS (default 0). It is always disclosed in the quote before
 * the buyer authorizes payment, and is charged on top of the service price.
 */
export function computeFee(priceUnits: string, feeBps: number): string {
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 1000) throw new Error("feeBps out of range");
  const price = BigInt(priceUnits);
  if (price < 0n) throw new Error("price must be non-negative");
  // round up so the platform never under-collects by a rounding unit
  return ((price * BigInt(feeBps) + 9999n) / 10000n).toString();
}
