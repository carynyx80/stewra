"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ErrorBox, LoadingBlock, SectionTitle, Stat } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { MiniBars } from "@/components/Charts";
import { api } from "@/lib/api";
import { fromUnits, usd } from "@/lib/format";

interface Overview {
  metrics: { completedTasks: number; failedTasks: number; revenueUnits: string; expensesUnits: string; netUnits: string; executionCostMicros: number };
  agents: { id: string; name: string; role: string; tasksCompleted: number; tasksFailed: number; costMicros: number }[];
  daily: { day: string; completed: number; failed: number; costMicros: number }[];
  tokenDecimals: number;
  tokenSymbol: string;
}

export default function AnalyticsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const q = useQuery({ queryKey: ["overview", orgId], queryFn: () => api<Overview>(`/orgs/${orgId}/overview`) });
  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? "Unavailable"} />;
  const { metrics: m, agents, daily, tokenDecimals: d, tokenSymbol: sym } = q.data;
  const finished = m.completedTasks + m.failedTasks;
  const day = (s: string) => new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const maxCost = Math.max(...agents.map((a) => a.costMicros), 1);

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Analytics" title="Business performance" body="Computed from task records and verified settlements only." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Task success rate" value={finished ? `${Math.round((m.completedTasks / finished) * 100)}%` : "—"} sub={`${m.completedTasks} of ${finished} finished`} />
        <Stat label="Execution cost" value={usd(m.executionCostMicros)} sub="Estimated model spend" />
        <Stat label="Cost per completed task" value={m.completedTasks ? usd(Math.round(m.executionCostMicros / m.completedTasks)) : "—"} />
        <Stat label="Net cash flow" value={`${fromUnits(m.netUnits, d, 2)} ${sym}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Glass className="p-5">
          <p className="mb-4 font-display font-semibold">Completed tasks per day</p>
          <MiniBars data={daily.map((x) => ({ label: day(x.day), value: x.completed }))} empty="No completed tasks in the last 30 days" />
        </Glass>
        <Glass className="p-5">
          <p className="mb-4 font-display font-semibold">Model cost per day</p>
          <MiniBars data={daily.map((x) => ({ label: day(x.day), value: x.costMicros }))} format={usd} empty="No model spend in the last 30 days" />
        </Glass>
      </div>
      <Glass className="p-5">
        <p className="mb-4 font-display font-semibold">Agent performance</p>
        {agents.length === 0 ? (
          <p className="text-sm text-dim">No agents.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-dim">
                <tr>
                  <th className="pb-2 font-normal">Agent</th>
                  <th className="pb-2 font-normal">Completed</th>
                  <th className="pb-2 font-normal">Failed</th>
                  <th className="pb-2 font-normal">Success</th>
                  <th className="pb-2 font-normal">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {agents.map((a) => {
                  const n = a.tasksCompleted + a.tasksFailed;
                  return (
                    <tr key={a.id}>
                      <td className="py-2.5">
                        {a.name} <span className="text-xs text-dim">· {a.role}</span>
                      </td>
                      <td className="py-2.5 tabular-nums">{a.tasksCompleted}</td>
                      <td className="py-2.5 tabular-nums">{a.tasksFailed}</td>
                      <td className="py-2.5 tabular-nums">{n ? `${Math.round((a.tasksCompleted / n) * 100)}%` : "—"}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/5">
                            <div className="h-full rounded-full bg-lime" style={{ width: `${(a.costMicros / maxCost) * 100}%` }} />
                          </div>
                          <span className="tabular-nums text-mist">{usd(a.costMicros)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Glass>
    </div>
  );
}
