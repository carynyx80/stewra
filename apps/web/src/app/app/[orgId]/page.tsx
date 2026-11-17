"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Crown } from "lucide-react";
import { ErrorBox, LoadingBlock, SectionTitle, Stat, StatusPill } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { ObjectiveComposer } from "@/components/ObjectiveComposer";
import { ActivityFeed } from "@/components/ActivityFeed";
import { MiniBars } from "@/components/Charts";
import { api } from "@/lib/api";
import { useActivityStream, useOrg } from "@/lib/hooks";
import { fromUnits, timeAgo, usd } from "@/lib/format";
import type { Task } from "@/lib/types";

interface Overview {
  metrics: {
    activeAgents: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
    pendingApprovals: number;
    openSalesOrders: number;
    revenueUnits: string;
    expensesUnits: string;
    netUnits: string;
    executionCostMicros: number;
  };
  agents: { id: string; name: string; role: string; status: string; tasksCompleted: number; tasksFailed: number; costMicros: number }[];
  recentTasks: Task[];
  daily: { day: string; completed: number; failed: number; costMicros: number }[];
  tokenDecimals: number;
  tokenSymbol: string;
}

export default function CommandCenter({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const qc = useQueryClient();
  const org = useOrg(orgId);
  const overview = useQuery({ queryKey: ["overview", orgId], queryFn: () => api<Overview>(`/orgs/${orgId}/overview`), refetchInterval: 30_000 });
  const stream = useActivityStream(orgId, () => {
    qc.invalidateQueries({ queryKey: ["overview", orgId] });
  });

  if (overview.isLoading || org.isLoading) return <LoadingBlock rows={5} />;
  if (overview.error) return <ErrorBox error={overview.error} onRetry={() => overview.refetch()} />;
  const o = overview.data!;
  const m = o.metrics;
  const fmt = (u: string) => `${fromUnits(u, o.tokenDecimals, 2)} ${o.tokenSymbol}`;

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Command center" title={org.data?.org.name ?? "Business"} body={org.data?.org.description} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Revenue received" value={fmt(m.revenueUnits)} sub="Settled onchain" />
        <Stat label="Expenses paid" value={fmt(m.expensesUnits)} sub="Accepted purchases" />
        <Stat label="Net operating cash flow" value={fmt(m.netUnits)} />
        <Stat label="Agent execution cost" value={usd(m.executionCostMicros)} sub="Estimated model spend" />
        <Stat label="Active agents" value={m.activeAgents} />
        <Stat label="Running tasks" value={m.runningTasks} />
        <Stat label="Completed jobs" value={m.completedTasks} sub={m.failedTasks ? `${m.failedTasks} failed` : undefined} />
        <Link href={`/app/${orgId}/approvals`}>
          <Stat label="Pending approvals" value={<span className={m.pendingApprovals ? "text-warn" : ""}>{m.pendingApprovals}</span>} sub={`${m.openSalesOrders} open customer orders`} />
        </Link>
      </div>

      <ObjectiveComposer orgId={orgId} />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Glass className="p-5">
          <ActivityFeed orgId={orgId} live={stream.events} connected={stream.connected} limit={14} />
        </Glass>
        <div className="space-y-6">
          <Glass className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display font-semibold">Workforce</p>
              <Link href={`/app/${orgId}/agents`} className="text-xs text-lime hover:underline">
                Manage
              </Link>
            </div>
            <ul className="space-y-1">
              {o.agents.map((a) => (
                <li key={a.id}>
                  <Link href={`/app/${orgId}/agents/${a.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-mist">
                      {a.role === "CEO" ? <Crown className="h-3.5 w-3.5 text-lime" /> : <Bot className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{a.name}</span>
                      <span className="text-xs text-dim">
                        {a.tasksCompleted} done · {usd(a.costMicros)}
                      </span>
                    </span>
                    <StatusPill status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Glass>
          <Glass className="p-5">
            <p className="mb-4 font-display font-semibold">Jobs completed · last 30 days</p>
            <MiniBars data={o.daily.map((d) => ({ label: new Date(d.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }), value: d.completed }))} empty="No completed jobs yet" />
          </Glass>
        </div>
      </div>

      <Glass className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display font-semibold">Recent tasks</p>
          <Link href={`/app/${orgId}/projects`} className="text-xs text-lime hover:underline">
            All projects
          </Link>
        </div>
        {o.recentTasks.length === 0 ? (
          <p className="text-sm text-dim">No tasks yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {o.recentTasks.map((t) => (
              <li key={t.id}>
                <Link href={t.projectId ? `/app/${orgId}/projects/${t.projectId}` : "#"} className="flex items-center gap-3 py-2.5 text-sm hover:text-lime">
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <span className="hidden text-xs text-dim md:inline">{t.agent?.name}</span>
                  <span className="text-xs text-dim">{timeAgo(t.updatedAt)}</span>
                  <StatusPill status={t.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Glass>
    </div>
  );
}
