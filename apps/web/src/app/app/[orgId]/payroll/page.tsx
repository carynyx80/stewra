"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Coins, Gauge, Milestone, Repeat, Trophy } from "lucide-react";
import { Badge, LoadingBlock, Notice, SectionTitle, Stat } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { api } from "@/lib/api";
import { fromUnits } from "@/lib/format";

/** Payroll today shows real per-task settlements; funded streams are planned and labelled as such. */
export default function PayrollPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const q = useQuery({
    queryKey: ["overview", orgId],
    queryFn: () => api<{ metrics: { expensesUnits: string; executionCostMicros: number }; tokenDecimals: number; tokenSymbol: string }>(`/orgs/${orgId}/overview`),
  });
  const models = [
    { icon: Coins, t: "Fixed payment per completed task", s: "Live — every marketplace order pays on acceptance through escrow.", live: true },
    { icon: Milestone, t: "Milestone-based payment", s: "Planned — multi-milestone escrow orders." },
    { icon: CalendarClock, t: "Time-based streaming", s: "Planned — fully funded streams that never promise more than is deposited." },
    { icon: Repeat, t: "Subscription payments", s: "Planned — recurring service payments with owner approval." },
    { icon: Trophy, t: "Performance bonuses", s: "Planned — bonuses tied to explicit, verifiable criteria." },
  ];
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Payroll" title="Compensation" body="How your business pays the agents and providers it works with." />
      <Notice tone="info">Funded payroll streams (PayrollStream.sol) are planned and not deployed. Nothing on this page simulates a stream.</Notice>
      {q.isLoading ? (
        <LoadingBlock rows={2} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Completed payments" value={q.data ? `${fromUnits(q.data.metrics.expensesUnits, q.data.tokenDecimals, 2)} ${q.data.tokenSymbol}` : "—"} sub="Accepted purchases" />
          <Stat label="Active streams" value="0" sub="Planned feature" />
          <Stat label="Claimable" value="—" sub="Planned feature" />
          <Stat label="Upcoming obligations" value="—" sub="Planned feature" />
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {models.map((m) => (
          <Glass key={m.t} className={`flex gap-4 p-5 ${m.live ? "" : "opacity-70"}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${m.live ? "border-lime/30 bg-lime/10 text-lime" : "border-line text-dim"}`}>
              <m.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="flex items-center gap-2 font-medium">
                {m.t} {m.live ? <Badge tone="lime">Live</Badge> : <Badge tone="warn">Planned</Badge>}
              </p>
              <p className="mt-1 text-sm text-mist">{m.s}</p>
            </div>
          </Glass>
        ))}
        <Glass className="flex gap-4 p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-mist">
            <Gauge className="h-4 w-4" />
          </span>
          <div>
            <p className="font-medium">Agent execution costs</p>
            <p className="mt-1 text-sm text-mist">Model usage is tracked per task and per agent and shown in Analytics.</p>
          </div>
        </Glass>
      </div>
    </div>
  );
}
