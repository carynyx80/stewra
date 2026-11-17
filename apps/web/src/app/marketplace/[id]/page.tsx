"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, FileInput, FileOutput, ShieldCheck, Star } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { Badge, Button, ErrorBox, Field, LoadingBlock, Notice, Select, Textarea } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { ConnectButton } from "@/components/ConnectButton";
import { ReputationPanel } from "@/components/ReputationPanel";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useOrgs } from "@/lib/hooks";
import { fmtDate, fromUnits } from "@/lib/format";
import type { Listing, Reputation } from "@/lib/types";

interface Quote {
  id: string;
  priceUnits: string;
  feeUnits: string;
  feeBps: number;
  expiresAt: string;
}

export default function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { session } = useAuth();
  const orgs = useOrgs();
  const [requirements, setRequirements] = useState("");
  const [buyerOrgId, setBuyerOrgId] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["listing", id],
    queryFn: () =>
      api<{ listing: Listing; reviews: { id: string; rating: number; comment: string; verified: boolean; createdAt: string }[]; reputation: Reputation; tokenDecimals: number; tokenSymbol: string; escrowReady: boolean }>(
        `/public/listings/${id}`,
        { auth: false },
      ),
  });

  const requestQuote = useMutation({
    mutationFn: () => api<{ quote: Quote }>(`/listings/${id}/quotes`, { body: { requirements, buyerOrgId: buyerOrgId || undefined } }),
    onSuccess: (d) => setQuote(d.quote),
  });

  const placeOrder = useMutation({
    mutationFn: () => api<{ order?: { id: string }; approvalRequired?: boolean; reason?: string }>(`/quotes/${quote!.id}/order`, { method: "POST" }),
    onSuccess: (d) => {
      if (d.approvalRequired) setApprovalNotice(d.reason ?? "This purchase needs owner approval.");
      else if (d.order) router.push(`/app/orders/${d.order.id}`);
    },
  });

  if (q.isLoading)
    return (
      <PublicShell>
        <div className="mx-auto max-w-6xl px-4 pt-16 md:px-6">
          <LoadingBlock rows={4} />
        </div>
      </PublicShell>
    );
  if (q.error || !q.data)
    return (
      <PublicShell>
        <div className="mx-auto max-w-6xl px-4 pt-16 md:px-6">
          <ErrorBox error={q.error ?? "Not found"} />
        </div>
      </PublicShell>
    );

  const { listing: l, reviews, reputation, tokenDecimals: d, tokenSymbol: sym, escrowReady } = q.data;
  const ownOrgIds = new Set(orgs.data?.orgs.map((o) => o.id));
  const isOwnListing = ownOrgIds.has(l.orgId);

  return (
    <PublicShell intensity={0.6}>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 md:px-6">
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-sm text-mist hover:text-frost">
          <ArrowLeft className="h-4 w-4" /> Marketplace
        </Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <Glass className="p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{l.category}</Badge>
                <Badge tone="info">
                  <Clock className="h-3 w-3" /> {l.deliveryHours}h delivery
                </Badge>
              </div>
              <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">{l.title}</h1>
              <p className="mt-2 text-sm text-mist">
                by{" "}
                <Link href={`/b/${l.org?.slug}`} className="text-frost hover:text-lime">
                  {l.org?.name}
                </Link>
                {l.agent && <> · fulfilled by {l.agent.name}</>}
              </p>
              <p className="mt-6 whitespace-pre-line leading-relaxed text-frost/90">{l.description}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-white/[0.02] p-4">
                  <p className="flex items-center gap-2 text-xs text-mist">
                    <FileInput className="h-3.5 w-3.5 text-lime" /> You provide
                  </p>
                  <p className="mt-1.5 text-sm">{l.inputFormat}</p>
                </div>
                <div className="rounded-xl border border-line bg-white/[0.02] p-4">
                  <p className="flex items-center gap-2 text-xs text-mist">
                    <FileOutput className="h-3.5 w-3.5 text-lime" /> You receive
                  </p>
                  <p className="mt-1.5 text-sm">{l.outputFormat}</p>
                </div>
              </div>
            </Glass>

            <Glass className="p-6">
              <h2 className="font-display text-lg font-semibold">Reviews</h2>
              {reviews.length === 0 ? (
                <p className="mt-3 text-sm text-mist">No reviews yet.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {reviews.map((r) => (
                    <li key={r.id} className="border-b border-line pb-4 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="flex text-lime">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : "opacity-25"}`} />
                          ))}
                        </span>
                        {r.verified ? <Badge tone="lime">Verified purchase</Badge> : <Badge>Unverified</Badge>}
                        <span className="text-xs text-dim">{fmtDate(r.createdAt)}</span>
                      </div>
                      {r.comment && <p className="mt-2 text-sm text-mist">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Glass>
          </div>

          <div className="space-y-6">
            <Glass className="p-6">
              <p className="text-xs text-mist">Price</p>
              <p className="mt-1 font-display text-3xl font-semibold">
                {fromUnits(l.priceUnits, d)} <span className="text-base text-mist">{sym}</span>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-dim">
                <ShieldCheck className="h-3.5 w-3.5 text-lime" /> Paid into escrow · released on your acceptance
              </p>

              <div className="mt-6 border-t border-line pt-6">
                {!escrowReady && <Notice tone="warn">Onchain escrow is not deployed on this network yet, so orders can&apos;t be funded. You can still request a quote.</Notice>}
                {!session ? (
                  <div className="space-y-3">
                    <p className="text-sm text-mist">Sign in with your wallet to request a quote.</p>
                    <ConnectButton size="md" />
                  </div>
                ) : isOwnListing ? (
                  <p className="text-sm text-mist">This is your own organization&apos;s service. Buying from yourself is not allowed.</p>
                ) : quote ? (
                  <div className="space-y-4">
                    <div className="space-y-2 rounded-xl border border-line bg-black/20 p-4 text-sm">
                      <Row k="Service price" v={`${fromUnits(quote.priceUnits, d)} ${sym}`} />
                      <Row k={`Platform fee (${(quote.feeBps / 100).toFixed(2)}%)`} v={`${fromUnits(quote.feeUnits, d)} ${sym}`} />
                      <div className="border-t border-line pt-2">
                        <Row k="Total to escrow" v={`${fromUnits((BigInt(quote.priceUnits) + BigInt(quote.feeUnits)).toString(), d)} ${sym}`} strong />
                      </div>
                      <p className="pt-1 text-xs text-dim">Quote expires {fmtDate(quote.expiresAt)}</p>
                    </div>
                    {approvalNotice ? (
                      <Notice tone="warn">
                        Approval required: {approvalNotice} The organization owner can approve it in the approval inbox, then you can place the order.
                      </Notice>
                    ) : null}
                    {placeOrder.error && <ErrorBox error={placeOrder.error} />}
                    <Button className="w-full" loading={placeOrder.isPending} disabled={!escrowReady} onClick={() => placeOrder.mutate()}>
                      Place order
                    </Button>
                    <button className="w-full text-xs text-mist hover:text-frost" onClick={() => setQuote(null)}>
                      Edit requirements
                    </button>
                  </div>
                ) : (
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      requestQuote.mutate();
                    }}
                  >
                    <Field label="Your requirements" hint="Be specific. The provider's agents work from exactly what you write.">
                      <Textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} required minLength={10} placeholder={`Describe what you need. Expected input: ${l.inputFormat}`} />
                    </Field>
                    <Field label="Buy as">
                      <Select value={buyerOrgId} onChange={(e) => setBuyerOrgId(e.target.value)}>
                        <option value="">Myself (personal wallet)</option>
                        {orgs.data?.orgs
                          .filter((o) => o.id !== l.orgId && (o.role === "OWNER" || o.role === "ADMIN"))
                          .map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} (applies its spending policy)
                            </option>
                          ))}
                      </Select>
                    </Field>
                    {requestQuote.error && <ErrorBox error={requestQuote.error} />}
                    <Button type="submit" className="w-full" loading={requestQuote.isPending} disabled={requirements.trim().length < 10}>
                      Request quote
                    </Button>
                  </form>
                )}
              </div>
            </Glass>
            <Glass className="p-6">
              <h2 className="mb-4 font-display text-base font-semibold">Provider reputation</h2>
              <ReputationPanel rep={reputation} />
            </Glass>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-mist">{k}</span>
      <span className={strong ? "font-semibold text-frost" : "text-frost"}>{v}</span>
    </div>
  );
}
