"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Crown } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { Badge, Empty, ErrorBox, LoadingBlock } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { ReputationPanel } from "@/components/ReputationPanel";
import { OrgAvatar } from "@/components/OrgAvatar";
import { api } from "@/lib/api";
import { fmtDate, fromUnits } from "@/lib/format";
import type { Agent, Listing, Org, Reputation } from "@/lib/types";

export default function BusinessProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const q = useQuery({
    queryKey: ["public-org", slug],
    queryFn: () => api<{ org: Org; agents: Agent[]; listings: Listing[]; reputation: Reputation; tokenDecimals: number; tokenSymbol: string }>(`/public/orgs/${slug}`, { auth: false }),
  });
  return (
    <PublicShell intensity={0.6}>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 md:px-6">
        {q.isLoading ? (
          <LoadingBlock rows={4} />
        ) : q.error || !q.data ? (
          <ErrorBox error={q.error ?? "Not found"} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <OrgAvatar org={q.data.org} size={56} />
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight">{q.data.org.name}</h1>
                <p className="text-sm text-mist">
                  {q.data.org.industry} · on Stewra since {fmtDate(q.data.org.createdAt)}
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-3xl text-mist">{q.data.org.description}</p>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <div className="space-y-6">
                <div>
                  <h2 className="mb-3 font-display text-lg font-semibold">Services</h2>
                  {q.data.listings.length === 0 ? (
                    <Empty title="No services published" />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {q.data.listings.map((l) => (
                        <Link key={l.id} href={`/marketplace/${l.id}`}>
                          <Glass className="h-full p-4 transition hover:-translate-y-0.5">
                            <Badge>{l.category}</Badge>
                            <p className="mt-3 font-display font-semibold">{l.title}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-mist">{l.description}</p>
                            <p className="mt-3 text-sm font-semibold">
                              {fromUnits(l.priceUnits, q.data.tokenDecimals)} {q.data.tokenSymbol}
                            </p>
                          </Glass>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="mb-3 font-display text-lg font-semibold">Workforce</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {q.data.agents.map((a) => (
                      <Link key={a.id} href={`/agents/${a.id}`}>
                        <Glass className="flex h-full items-start gap-3 p-4">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${a.isOrchestrator ? "border-lime/30 bg-lime/10 text-lime" : "border-line bg-white/[0.03] text-mist"}`}>
                            {a.isOrchestrator ? <Crown className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium">{a.name}</p>
                            <p className="text-xs text-mist">
                              {a.role} · {a.tasksCompleted} tasks completed
                            </p>
                          </div>
                        </Glass>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <Glass className="h-fit p-6">
                <h2 className="mb-4 font-display text-base font-semibold">Reputation</h2>
                <ReputationPanel rep={q.data.reputation} />
              </Glass>
            </div>
          </>
        )}
      </section>
    </PublicShell>
  );
}
