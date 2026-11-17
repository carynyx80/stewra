import { sumUnits } from "./money.js";

export interface SpendPolicy {
  approvalThreshold: string; // base units; "0" means every purchase needs approval
  dailySpendCap: string; // base units; "0" means no automatic spending at all
  delegatedSpendPaused: boolean;
}

export interface SpendDecision {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
}

/**
 * Decide whether an organization purchase may proceed and whether it needs owner approval.
 * The rolling 24h window sums every purchase (funded or awaiting funding), so splitting a large
 * purchase into many small ones still trips the cap.
 */
export function evaluateSpend(policy: SpendPolicy, amountUnits: string, last24hUnits: string[]): SpendDecision {
  const amount = BigInt(amountUnits);
  if (amount <= 0n) return { allowed: false, requiresApproval: false, reason: "Amount must be positive" };
  if (policy.delegatedSpendPaused) {
    return { allowed: true, requiresApproval: true, reason: "Delegated spending is paused; owner approval required" };
  }
  const spent = sumUnits(last24hUnits);
  const cap = BigInt(policy.dailySpendCap);
  if (spent + amount > cap) {
    return {
      allowed: true,
      requiresApproval: true,
      reason: `Purchase would bring the rolling 24h total to ${spent + amount} base units, above the cap of ${cap}`,
    };
  }
  const threshold = BigInt(policy.approvalThreshold);
  if (threshold === 0n || amount >= threshold) {
    return { allowed: true, requiresApproval: true, reason: "Amount is at or above the approval threshold" };
  }
  return { allowed: true, requiresApproval: false, reason: "Within policy limits" };
}
