"use client";

import { use, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Droplets, ExternalLink, ShieldAlert } from "lucide-react";
import { Badge, Button, ErrorBox, Field, Input, LoadingBlock, Notice, SectionTitle, Stat, Toggle } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { api } from "@/lib/api";
import { erc20Abi } from "@/lib/chain";
import { fmtDate, fromUnits, shortAddr } from "@/lib/format";
import { useOrg } from "@/lib/hooks";
import type { ChainConfig, Policy } from "@/lib/types";

interface Treasury {
  address: string;
  isDedicatedTreasury: boolean;
  balances: { eth: { balanceUnits: string; decimals: number }; tokens: { symbol: string; address: string; decimals: number; balanceUnits: string }[] } | null;
  balanceError: string | null;
  escrowedUnits: string;
  transactions: { id: string; txHash: string; direction: string; kind: string; amountUnits: string; counterparty: string; createdAt: string }[];
  policy: Policy | null;
  chain: ChainConfig;
}

export default function TreasuryPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const qc = useQueryClient();
  const org = useOrg(orgId);
  const q = useQuery({ queryKey: ["treasury", orgId], queryFn: () => api<Treasury>(`/orgs/${orgId}/treasury`), refetchInterval: 20_000 });
  const isOwner = org.data?.role === "OWNER";

  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? "Unavailable"} onRetry={() => q.refetch()} />;
  const t = q.data;
  const token = t.chain.settlementToken;
  const d = token?.decimals ?? 6;
  const tokenBal = t.balances?.tokens[0];
  const explorer = t.chain.explorerUrl;

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Treasury" title="Treasury & spending policy" body="Balances are read live from Robinhood Chain. Agents can never move funds; every payment is signed by a human wallet." />
      {t.policy?.delegatedSpendPaused && (
        <Notice tone="warn">
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Delegated spending is paused. Every purchase requires owner approval.
          </span>
        </Notice>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={`${token?.symbol ?? "Settlement token"} balance`} value={tokenBal ? fromUnits(tokenBal.balanceUnits, tokenBal.decimals, 2) : "—"} sub={token ? "Live chain state" : "Token not configured"} />
        <Stat label="ETH (gas)" value={t.balances ? fromUnits(t.balances.eth.balanceUnits, 18, 5) : "—"} />
        <Stat label="Held in escrow (purchases)" value={`${fromUnits(t.escrowedUnits, d, 2)}`} sub={token?.symbol} />
        <Stat label="Treasury wallet" value={<span className="font-mono text-base">{shortAddr(t.address)}</span>} sub={t.isDedicatedTreasury ? "Dedicated treasury" : "Owner wallet (no treasury set)"} />
      </div>
      {t.balanceError && <ErrorBox error={t.balanceError} onRetry={() => q.refetch()} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <PolicyForm orgId={orgId} policy={t.policy} decimals={d} symbol={token?.symbol ?? "tUSD"} canEdit={isOwner} onSaved={() => qc.invalidateQueries({ queryKey: ["treasury", orgId] })} />
        <div className="space-y-6">
          <TreasuryAddress orgId={orgId} current={t.isDedicatedTreasury ? t.address : ""} canEdit={isOwner} onSaved={() => qc.invalidateQueries({ queryKey: ["treasury", orgId] })} />
          {token && t.chain.chainId !== 4663 && <Faucet token={token.address} onDone={() => qc.invalidateQueries({ queryKey: ["treasury", orgId] })} />}
        </div>
      </div>

      <Glass className="p-5">
        <p className="mb-3 font-display font-semibold">Transaction history</p>
        {t.transactions.length === 0 ? (
          <p className="text-sm text-dim">No verified treasury transactions yet. Funded purchases and settled sales appear here once confirmed onchain.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-dim">
                <tr>
                  <th className="pb-2 font-normal">Date</th>
                  <th className="pb-2 font-normal">Type</th>
                  <th className="pb-2 font-normal">Amount</th>
                  <th className="pb-2 font-normal">Counterparty</th>
                  <th className="pb-2 font-normal">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {t.transactions.map((x) => (
                  <tr key={x.id}>
                    <td className="py-2.5 text-mist">{fmtDate(x.createdAt)}</td>
                    <td className="py-2.5">
                      <Badge tone={x.direction === "in" ? "lime" : "neutral"}>{x.kind.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className={`py-2.5 font-mono ${x.direction === "in" ? "text-lime" : ""}`}>
                      {x.direction === "in" ? "+" : "−"}
                      {fromUnits(x.amountUnits, d)}
                    </td>
                    <td className="py-2.5 font-mono text-xs text-mist">{shortAddr(x.counterparty)}</td>
                    <td className="py-2.5 font-mono text-xs">
                      {explorer ? (
                        <a href={`${explorer}/tx/${x.txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-lime hover:underline">
                          {shortAddr(x.txHash)} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        shortAddr(x.txHash)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Glass>
    </div>
  );
}

function PolicyForm({ orgId, policy, decimals, symbol, canEdit, onSaved }: { orgId: string; policy: Policy | null; decimals: number; symbol: string; canEdit: boolean; onSaved: () => void }) {
  const [v, setV] = useState({ approvalThreshold: "0", dailySpendCap: "0", maxAgentRunCostUsd: 2, requireHiringApproval: true, delegatedSpendPaused: false });
  useEffect(() => {
    if (policy)
      setV({
        approvalThreshold: fromUnits(policy.approvalThreshold, decimals, decimals).replace(/,/g, ""),
        dailySpendCap: fromUnits(policy.dailySpendCap, decimals, decimals).replace(/,/g, ""),
        maxAgentRunCostUsd: policy.maxAgentRunCostMicros / 1e6,
        requireHiringApproval: policy.requireHiringApproval,
        delegatedSpendPaused: policy.delegatedSpendPaused,
      });
  }, [policy, decimals]);
  const save = useMutation({ mutationFn: () => api(`/orgs/${orgId}/policy`, { method: "PUT", body: v }), onSuccess: onSaved });
  return (
    <Glass className="p-5">
      <p className="mb-1 font-display font-semibold">Spending policy</p>
      <p className="mb-4 text-xs text-dim">Enforced server-side for every organization purchase. Owner only.</p>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label={`Approval threshold (${symbol})`} hint="Purchases at or above this need owner approval. 0 means every purchase does.">
          <Input value={v.approvalThreshold} onChange={(e) => setV({ ...v, approvalThreshold: e.target.value })} inputMode="decimal" disabled={!canEdit} />
        </Field>
        <Field label={`Rolling 24h spend cap (${symbol})`} hint="Total of all purchases in any 24 hours. Splitting a purchase into smaller ones still counts toward this cap.">
          <Input value={v.dailySpendCap} onChange={(e) => setV({ ...v, dailySpendCap: e.target.value })} inputMode="decimal" disabled={!canEdit} />
        </Field>
        <Field label="Per-run model cost cap (USD, estimated)" hint="Agent runs stop when they exceed this. Objectives estimated above it need approval.">
          <Input type="number" step="0.01" min="0.01" max="100" value={v.maxAgentRunCostUsd} onChange={(e) => setV({ ...v, maxAgentRunCostUsd: Number(e.target.value) })} disabled={!canEdit} />
        </Field>
        <div className="space-y-3">
          <Toggle checked={v.requireHiringApproval} onChange={(x) => canEdit && setV({ ...v, requireHiringApproval: x })} label="Require approval to hire external agents" />
          <Toggle checked={v.delegatedSpendPaused} onChange={(x) => canEdit && setV({ ...v, delegatedSpendPaused: x })} label="Emergency pause: block all delegated spending" />
        </div>
        {save.error && <ErrorBox error={save.error} />}
        {save.isSuccess && <p className="text-sm text-lime">Policy saved.</p>}
        <Button type="submit" loading={save.isPending} disabled={!canEdit}>
          Save policy
        </Button>
      </form>
    </Glass>
  );
}

function TreasuryAddress({ orgId, current, canEdit, onSaved }: { orgId: string; current: string; canEdit: boolean; onSaved: () => void }) {
  const [address, setAddress] = useState(current);
  useEffect(() => setAddress(current), [current]);
  const save = useMutation({ mutationFn: () => api(`/orgs/${orgId}/treasury-address`, { method: "PUT", body: { address } }), onSuccess: onSaved });
  return (
    <Glass className="p-5">
      <p className="mb-1 font-display font-semibold">Treasury wallet</p>
      <p className="mb-4 text-xs text-dim">A wallet or multisig separate from your personal wallet. Sales are paid out here. Smart-account permissions are planned.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x…" className="font-mono" disabled={!canEdit} />
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!canEdit || !address}>
          Save
        </Button>
      </div>
      {save.error && <div className="mt-3"><ErrorBox error={save.error} /></div>}
    </Glass>
  );
}

function Faucet({ token, onDone }: { token: `0x${string}`; onDone: () => void }) {
  const { isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  useEffect(() => {
    if (receipt.isSuccess) onDone();
  }, [receipt.isSuccess, onDone]);
  return (
    <Glass className="p-5">
      <p className="mb-1 flex items-center gap-2 font-display font-semibold">
        <Droplets className="h-4 w-4 text-lime" /> Test token faucet
      </p>
      <p className="mb-4 text-xs text-dim">Mint 1,000 test tUSD to your connected wallet (once per hour). Test tokens have no value.</p>
      <Button variant="secondary" disabled={!isConnected} loading={isPending || receipt.isLoading} onClick={() => writeContract({ address: token, abi: erc20Abi, functionName: "faucet" })}>
        Mint test tokens
      </Button>
      {receipt.isSuccess && <p className="mt-2 text-sm text-lime">Minted.</p>}
      {error && <p className="mt-2 text-xs text-danger">{error.message.split("\n")[0]}</p>}
    </Glass>
  );
}
