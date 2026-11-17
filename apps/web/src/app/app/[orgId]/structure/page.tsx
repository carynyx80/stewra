"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bot, Crown } from "lucide-react";
import { ErrorBox, LoadingBlock, SectionTitle, StatusPill } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { api } from "@/lib/api";
import type { Agent } from "@/lib/types";

export default function StructurePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const q = useQuery({ queryKey: ["agents", orgId], queryFn: () => api<{ agents: Agent[] }>(`/orgs/${orgId}/agents`), refetchInterval: 8000 });
  if (q.isLoading) return <LoadingBlock rows={3} />;
  if (q.error) return <ErrorBox error={q.error} />;
  const agents = q.data!.agents;
  const leads = agents.filter((a) => a.isOrchestrator);
  const departments = new Map<string, Agent[]>();
  for (const a of agents.filter((x) => !x.isOrchestrator)) departments.set(a.department, [...(departments.get(a.department) ?? []), a]);

  return (
    <div>
      <SectionTitle eyebrow="Organization" title="Structure" body="Orchestrators delegate to specialists across departments. Status updates live." />
      <Glass className="relative overflow-hidden p-6 md:p-10">
        <div className="grid-fade absolute inset-0" />
        <div className="relative flex flex-col items-center">
          <div className="flex flex-wrap justify-center gap-3">
            {leads.map((a) => (
              <Node key={a.id} a={a} orgId={orgId} lead />
            ))}
            {leads.length === 0 && <p className="text-sm text-warn">No orchestrator. Objectives need one; mark an agent as an orchestrator.</p>}
          </div>
          {departments.size > 0 && <div className="h-10 w-px bg-gradient-to-b from-lime/60 to-line-strong" />}
          <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...departments.entries()].map(([dept, list], i) => (
              <motion.div key={dept} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl border border-line bg-void/40 p-4">
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-dim">{dept}</p>
                <div className="space-y-2">
                  {list.map((a) => (
                    <Node key={a.id} a={a} orgId={orgId} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Glass>
    </div>
  );
}

function Node({ a, orgId, lead }: { a: Agent; orgId: string; lead?: boolean }) {
  return (
    <Link href={`/app/${orgId}/agents/${a.id}`} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition hover:-translate-y-0.5 ${lead ? "border-lime/40 bg-lime/[0.07]" : "border-line bg-white/[0.02]"}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${lead ? "text-lime" : "text-mist"}`}>{lead ? <Crown className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{a.name}</span>
        <span className="text-xs text-dim">{a.role}</span>
      </span>
      <StatusPill status={a.status} />
    </Link>
  );
}
