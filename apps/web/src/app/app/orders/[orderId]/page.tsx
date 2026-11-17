"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, Lock, ShieldAlert, Star } from "lucide-react";
import { Badge, Button, ErrorBox, Field, LoadingBlock, Markdown, Notice, SectionTitle, StatusPill, Textarea } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { api } from "@/lib/api";
import { erc20Abi, escrowAbi } from "@/lib/chain";
import { fmtDate, fromUnits, shortAddr } from "@/lib/format";
import type { ChainConfig, Order } from "@/lib/types";

interface OrderData {
  order: Order;
  project: { id: string; orgId: string; tasks: { id: string; title: string; status: string }[] } | null;
  isBuyer: boolean;
  isSeller: boolean;
  chain: ChainConfig;
}

export default function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const q = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api<OrderData>(`/orders/${orderId}`),
    refetchInterval: (query) => (["FUNDED", "IN_PROGRESS"].includes(query.state.data?.order.status ?? "") ? 5000 : false),
  });
  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? "Not found"} />;
  const { order: o, project, isBuyer, isSeller, chain } = q.data;
  const d = chain.settlementToken?.decimals ?? 6;
  const sym = chain.settlementToken?.symbol ?? "tUSD";
  const total = (BigInt(o.amountUnits) + BigInt(o.feeUnits)).toString();
  const explorer = chain.explorerUrl;
  const txLink = (h: string) =>
    explorer ? (
      <a href={`${explorer}/tx/${h}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-lime hover:underline">
        {shortAddr(h)} <ExternalLink className="h-3 w-3" />
      </a>
    ) : (
      <span className="font-mono">{shortAddr(h)}</span>
    );
  const delivery = o.deliverables?.[o.deliverables.length - 1];

  return (
    <div>
      <Link href={isBuyer ? "/app/purchases" : `/app/${o.sellerOrgId}/orders`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-mist hover:text-frost">
        <ArrowLeft className="h-4 w-4" /> Orders
      </Link>
      <SectionTitle eyebrow={`Order #${o.id.slice(-6)}`} title={o.listing?.title ?? "Service order"} body={`From ${o.sellerOrg?.name} · placed ${fmtDate(o.createdAt)}`} action={<StatusPill status={o.status} />} />
      {o.isTest && <div className="mb-4"><Notice tone="info">Test order. Settlement uses test tokens with no value.</Notice></div>}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Glass className="p-5">
            <p className="mb-2 font-display font-semibold">Requirements</p>
            <p className="whitespace-pre-wrap text-sm text-mist">{o.requirements}</p>
          </Glass>

          {delivery ? (
            <Glass className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="flex items-center gap-2 font-display font-semibold">
                  <FileText className="h-4 w-4 text-lime" /> Delivery
                </p>
                <span className="font-mono text-[11px] text-dim">sha256 {delivery.contentHash.slice(0, 12)}…</span>
              </div>
              {delivery.isMock && <div className="mb-3"><Notice tone="warn">Produced in local mock mode — not real work.</Notice></div>}
              <Markdown>{delivery.content}</Markdown>
            </Glass>
          ) : (
            <Glass className="p-5">
              <p className="font-display font-semibold">Delivery</p>
              <p className="mt-2 text-sm text-mist">
                {o.status === "AWAITING_FUNDING"
                  ? "The seller's agents start as soon as the escrow is funded."
                  : ["FUNDED", "IN_PROGRESS"].includes(o.status)
                    ? "The seller's AI workforce is working on this order."
                    : "No delivery."}
              </p>
              {project && (isSeller ? (
                <Link href={`/app/${project.orgId}/projects/${project.id}`} className="mt-3 inline-block text-sm text-lime hover:underline">
                  Open the fulfilment project →
                </Link>
              ) : (
                <ul className="mt-3 space-y-1 text-sm">
                  {project.tasks.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-mist">{t.title}</span>
                      <StatusPill status={t.status} />
                    </li>
                  ))}
                </ul>
              ))}
            </Glass>
          )}
        </div>

        <div className="space-y-6">
          <Glass className="p-5">
            <p className="mb-3 flex items-center gap-2 font-display font-semibold">
              <Lock className="h-4 w-4 text-lime" /> Escrow
            </p>
            <dl className="space-y-2 text-sm">
              <Row k="Service price" v={`${fromUnits(o.amountUnits, d)} ${sym}`} />
              <Row k="Platform fee" v={`${fromUnits(o.feeUnits, d)} ${sym}`} />
              <Row k="Total" v={<strong>{`${fromUnits(total, d)} ${sym}`}</strong>} />
              <Row k="Seller payout" v={<span className="font-mono">{shortAddr(o.sellerAddress)}</span>} />
              <Row k="Delivery deadline" v={fmtDate(o.deadline)} />
              {o.fundTxHash && <Row k="Funding tx" v={txLink(o.fundTxHash)} />}
              {o.releaseTxHash && <Row k="Settlement tx" v={txLink(o.releaseTxHash)} />}
            </dl>
            {isBuyer && <BuyerActions data={q.data} total={total} />}
            {!isBuyer && isSeller && o.status === "AWAITING_FUNDING" && <p className="mt-4 text-xs text-dim">Waiting for the buyer to fund the escrow.</p>}
          </Glass>

          {o.receipt && (
            <Glass className="p-5">
              <p className="mb-3 flex items-center gap-2 font-display font-semibold">
                <CheckCircle2 className="h-4 w-4 text-lime" /> Payment receipt
              </p>
              <dl className="space-y-2 text-sm">
                <Row k="Paid to seller" v={`${fromUnits(o.receipt.amountUnits, d)} ${sym}`} />
                <Row k="Fee" v={`${fromUnits(o.receipt.feeUnits, d)} ${sym}`} />
                <Row k="Payer" v={<span className="font-mono">{shortAddr(o.receipt.payer)}</span>} />
                <Row k="Payee" v={<span className="font-mono">{shortAddr(o.receipt.payee)}</span>} />
                <Row k="Block" v={o.receipt.blockNumber} />
                <Row k="Transaction" v={txLink(o.receipt.txHash)} />
              </dl>
            </Glass>
          )}
          {o.dispute && (
            <Notice tone="warn">
              <span className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> Dispute open: {o.dispute.reason}. The arbiter will resolve it onchain.
              </span>
            </Notice>
          )}
          {isBuyer && o.status === "ACCEPTED" && <ReviewBox orderId={o.id} existing={o.review ?? null} />}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-mist">{k}</dt>
      <dd className="text-right text-frost">{v}</dd>
    </div>
  );
}

/** Drives the onchain escrow flow from the buyer's wallet, then reports each tx to the API for verification. */
function BuyerActions({ data, total }: { data: OrderData; total: string }) {
  const { order: o, chain } = data;
  const qc = useQueryClient();
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const client = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const token = chain.settlementToken?.address;
  const escrow = o.escrowAddress ?? chain.escrowAddress;

  const allowance = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && escrow ? [address, escrow] : undefined,
    query: { enabled: Boolean(token && address && escrow && o.status === "AWAITING_FUNDING") },
  });
  const balance = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(token && address && o.status === "AWAITING_FUNDING") },
  });

  const wrongWallet = address && address.toLowerCase() !== o.buyerAddress.toLowerCase();
  const wrongChain = chainId !== o.chainId;

  async function run(label: string, fn: () => Promise<void>) {
    setError(null);
    setStep(label);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["order", o.id] });
    } catch (e) {
      const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
      setError(/rejected|denied/i.test(msg) ? "Transaction was rejected in your wallet." : msg);
    } finally {
      setStep(null);
    }
  }

  const send = async (fn: () => Promise<`0x${string}`>) => {
    const hash = await fn();
    const receipt = await client!.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Transaction reverted onchain.");
    return hash;
  };

  const report = useMutation({ mutationFn: ({ path, body }: { path: string; body: unknown }) => api(`/orders/${o.id}/${path}`, { body }) });

  if (!escrow || !token) return <p className="mt-4 text-xs text-warn">Escrow is not configured on this deployment.</p>;
  if (wrongWallet) return <p className="mt-4 text-xs text-warn">Connect the wallet that placed this order ({shortAddr(o.buyerAddress)}).</p>;
  if (wrongChain)
    return (
      <Button className="mt-4 w-full" variant="secondary" onClick={() => switchChain({ chainId: o.chainId })}>
        Switch network
      </Button>
    );

  const needsApproval = allowance.data !== undefined && allowance.data < BigInt(total);
  const insufficient = balance.data !== undefined && balance.data < BigInt(total);
  const pastDeadline = new Date(o.deadline).getTime() < Date.now();

  return (
    <div className="mt-5 space-y-3 border-t border-line pt-5">
      {o.status === "AWAITING_FUNDING" && (
        <>
          {insufficient && <Notice tone="warn">Your wallet holds less than the total. You can mint test tokens from the Treasury page faucet.</Notice>}
          <div className="flex items-center gap-2 text-xs text-mist">
            <Badge tone={needsApproval ? "warn" : "lime"}>1</Badge> Approve escrow to transfer {chain.settlementToken?.symbol}
          </div>
          <Button
            className="w-full"
            variant={needsApproval ? "primary" : "secondary"}
            disabled={!needsApproval || Boolean(step)}
            loading={step === "approve"}
            onClick={() =>
              run("approve", async () => {
                await send(() => writeContractAsync({ address: token, abi: erc20Abi, functionName: "approve", args: [escrow, BigInt(total)] }));
                await allowance.refetch();
              })
            }
          >
            {needsApproval ? "Approve" : "Approved"}
          </Button>
          <div className="flex items-center gap-2 text-xs text-mist">
            <Badge tone="neutral">2</Badge> Fund the escrow order
          </div>
          <Button
            className="w-full"
            disabled={needsApproval || insufficient || Boolean(step)}
            loading={step === "fund"}
            onClick={() =>
              run("fund", async () => {
                const hash = await send(() =>
                  writeContractAsync({
                    address: escrow,
                    abi: escrowAbi,
                    functionName: "fund",
                    args: [o.escrowOrderId, o.sellerAddress, token, BigInt(o.amountUnits), BigInt(o.feeUnits), BigInt(Math.floor(new Date(o.deadline).getTime() / 1000))],
                  }),
                );
                await report.mutateAsync({ path: "funded", body: { txHash: hash } });
              })
            }
          >
            Fund escrow
          </Button>
        </>
      )}

      {["FUNDED", "IN_PROGRESS", "DELIVERED"].includes(o.status) && (
        <>
          <Button
            className="w-full"
            disabled={Boolean(step)}
            loading={step === "accept"}
            onClick={() =>
              run("accept", async () => {
                const hash = await send(() => writeContractAsync({ address: escrow, abi: escrowAbi, functionName: "accept", args: [o.escrowOrderId] }));
                await report.mutateAsync({ path: "accepted", body: { txHash: hash } });
              })
            }
          >
            Accept delivery & release payment
          </Button>
          <p className="text-[11px] text-dim">Releasing pays the seller from escrow. It cannot be undone.</p>
          <Field label="Not satisfied?">
            <Textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Explain what is wrong with the delivery" className="min-h-20" />
          </Field>
          <Button
            className="w-full"
            variant="danger"
            disabled={disputeReason.trim().length < 10 || Boolean(step)}
            loading={step === "dispute"}
            onClick={() =>
              run("dispute", async () => {
                const hash = await send(() => writeContractAsync({ address: escrow, abi: escrowAbi, functionName: "openDispute", args: [o.escrowOrderId] }));
                await report.mutateAsync({ path: "dispute", body: { txHash: hash, reason: disputeReason } });
              })
            }
          >
            Open dispute
          </Button>
          {pastDeadline && o.status !== "DELIVERED" && (
            <Button
              className="w-full"
              variant="secondary"
              disabled={Boolean(step)}
              loading={step === "refund"}
              onClick={() =>
                run("refund", async () => {
                  const hash = await send(() => writeContractAsync({ address: escrow, abi: escrowAbi, functionName: "refundAfterDeadline", args: [o.escrowOrderId] }));
                  await report.mutateAsync({ path: "refunded", body: { txHash: hash } });
                })
              }
            >
              Refund (deadline passed)
            </Button>
          )}
        </>
      )}
      {error && <ErrorBox error={error} />}
    </div>
  );
}

function ReviewBox({ orderId, existing }: { orderId: string; existing: { rating: number; comment: string; verified: boolean } | null }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const submit = useMutation({ mutationFn: () => api(`/orders/${orderId}/review`, { body: { rating, comment } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["order", orderId] }) });
  if (existing)
    return (
      <Glass className="p-5 text-sm">
        <p className="font-display font-semibold">Your review</p>
        <p className="mt-2 text-lime">{"★".repeat(existing.rating)}</p>
        {existing.comment && <p className="mt-1 text-mist">{existing.comment}</p>}
        <p className="mt-2 text-xs text-dim">{existing.verified ? "Counted as a verified purchase." : "Not counted toward verified reputation."}</p>
      </Glass>
    );
  return (
    <Glass className="space-y-3 p-5">
      <p className="font-display font-semibold">Rate this service</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star className={`h-6 w-6 ${n <= rating ? "fill-lime text-lime" : "text-dim"}`} />
          </button>
        ))}
      </div>
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment" className="min-h-20" maxLength={2000} />
      {submit.error && <ErrorBox error={submit.error} />}
      <Button onClick={() => submit.mutate()} loading={submit.isPending}>
        Submit review
      </Button>
    </Glass>
  );
}
