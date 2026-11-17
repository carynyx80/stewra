"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Crown, Wrench } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { Badge, ErrorBox, LoadingBlock, StatusPill } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { ReputationPanel } from "@/components/ReputationPanel";
import { api } from "@/lib/api";
import { fromUnits } from "@/lib/format";
import type { Agent, Listing, Reputation } from "@/lib/types";

export default function PublicAgentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useQuery({
    queryKey: ["public-agent", id],
    queryFn: () =>
      api<{ agent: Agent & { org: { id: string; name: string; slug: string } }; listings: Listing[]; reputation: Reputation; tokenDecimals: number; tokenSymbol: string }>(`/public/agents/${id}`, { auth: false }),
  });
  return (
    <PublicShell intensity={0.6}>
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-14 md:px-6">
        {q.isLoading ? (
          <LoadingBlock rows={3} />
        ) : q.error || !q.data ? (
          <ErrorBox error={q.error ?? "Not found"} />
        ) : (
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <Glass className="p-6 md:p-8">
              <div className="flex items-center gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${q.data.agent.isOrchestrator ? "border-lime/30 bg-lime/10 text-lime" : "border-line bg-white/[0.03] text-mist"}`}>
                  {q.data.agent.isOrchestrator ? <Crown className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </span>
                <div>
                  <h1 className="font-display text-2xl font-semibold">{q.data.agent.name}</h1>
                  <p className="text-sm text-mist">
                    {q.data.agent.role} at{" "}
                    <Link href={`/b/${q.data.agent.org.slug}`} className="text-frost hover:text-lime">
                      {q.data.agent.org.name}
                    </Link>
                  </p>
                </div>
              </div>
              <p className="mt-6 text-mist">{q.data.agent.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <StatusPill status={q.data.agent.status} />
                <Badge>{q.data.agent.model}</Badge>
                <Badge tone="lime">{q.data.agent.tasksCompleted} tasks completed</Badge>
                <Badge>{q.data.agent.tasksFailed} failed</Badge>
              </div>
              <div className="mt-6">
                <p className="mb-2 flex items-center gap-2 text-xs text-mist">
                  <Wrench className="h-3.5 w-3.5" /> Tools
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {q.data.agent.tools.map((t) => (
                    <code key={t} className="rounded-md border border-line bg-white/[0.03] px-2 py-0.5 font-mono text-xs text-mist">
                      {t}
                    </code>
                  ))}
                </div>
              </div>
              {q.data.listings.length > 0 && (
                <div className="mt-8">
                  <h2 className="mb-3 font-display font-semibold">Services this agent fulfils</h2>
                  <ul className="space-y-2">
                    {q.data.listings.map((l) => (
                      <li key={l.id}>
                        <Link href={`/marketplace/${l.id}`} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm hover:bg-white/[0.03]">
                          {l.title}
                          <span className="text-mist">
                            {fromUnits(l.priceUnits, q.data.tokenDecimals)} {q.data.tokenSymbol}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Glass>
            <Glass className="h-fit p-6">
              <h2 className="mb-4 font-display text-base font-semibold">Business reputation</h2>
              <ReputationPanel rep={q.data.reputation} />
            </Glass>
          </div>
        )}
      </section>
    </PublicShell>
  );
}
