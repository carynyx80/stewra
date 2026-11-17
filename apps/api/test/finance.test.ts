import { describe, expect, it } from "vitest";
import { computeFee } from "../src/fees.js";
import { evaluateSpend } from "../src/policy.js";
import { fromUnits, toUnits } from "../src/money.js";

describe("money", () => {
  it("round-trips decimal amounts", () => {
    expect(toUnits("12.5", 6)).toBe("12500000");
    expect(toUnits("0.000001", 6)).toBe("1");
    expect(fromUnits("12500000", 6)).toBe("12.5");
    expect(fromUnits("1", 6)).toBe("0.000001");
  });
  it("rejects malformed or over-precise amounts", () => {
    expect(() => toUnits("1e5", 6)).toThrow();
    expect(() => toUnits("-1", 6)).toThrow();
    expect(() => toUnits("0.0000001", 6)).toThrow();
  });
});

describe("fee engine", () => {
  it("charges nothing at 0 bps", () => expect(computeFee("1000000", 0)).toBe("0"));
  it("rounds up to never under-collect", () => {
    expect(computeFee("1000000", 250)).toBe("25000");
    expect(computeFee("1", 1)).toBe("1");
  });
  it("rejects out-of-range rates", () => {
    expect(() => computeFee("100", -1)).toThrow();
    expect(() => computeFee("100", 1001)).toThrow();
  });
});

describe("spend policy", () => {
  const policy = { approvalThreshold: "100", dailySpendCap: "500", delegatedSpendPaused: false };

  it("allows small purchases within the cap without approval", () => {
    expect(evaluateSpend(policy, "50", [])).toMatchObject({ allowed: true, requiresApproval: false });
  });
  it("requires approval at or above the threshold", () => {
    expect(evaluateSpend(policy, "100", []).requiresApproval).toBe(true);
  });
  it("defeats split purchases with the rolling 24h cap", () => {
    const priorSplits = Array(10).fill("49"); // 490 already spent in small pieces
    expect(evaluateSpend(policy, "49", priorSplits).requiresApproval).toBe(true);
  });
  it("requires approval for everything when paused", () => {
    expect(evaluateSpend({ ...policy, delegatedSpendPaused: true }, "1", []).requiresApproval).toBe(true);
  });
  it("defaults to approval when no threshold is set", () => {
    expect(evaluateSpend({ approvalThreshold: "0", dailySpendCap: "1000", delegatedSpendPaused: false }, "1", []).requiresApproval).toBe(true);
  });
  it("rejects non-positive amounts", () => {
    expect(evaluateSpend(policy, "0", []).allowed).toBe(false);
  });
});
