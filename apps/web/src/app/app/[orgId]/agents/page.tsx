"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Crown, Plus, X } from "lucide-react";
import { Badge, Button, Empty, ErrorBox, LoadingBlock, SectionTitle, StatusPill } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { AgentForm } from "@/components/AgentForm";
import { api } from "@/lib/api";
import { usd } from "@/lib/format";
import type { Agent } from "@/lib/types";

export default function WorkforcePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const agents = useQuery({ queryKey: ["agents", orgId], queryFn: () => api<{ agents: Agent[] }>(`/orgs/${orgId}/agents`) });
  const create = useMutation({
    mutationFn: (body: unknown) => api(`/orgs/${orgId}/agents`, { body }),
    onSuccess: () => {
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["agents", orgId] });
    },
  });

  return (
    <div>
      <SectionTitle
        eyebrow="Workforce"
        title="AI agents"
        body="Each agent has a role, a model, scoped tools and permission limits."
        action={
          <Button onClick={() => setCreating(!creating)} variant={creating ? "secondary" : "primary"}>
            {creating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {creating ? "Close" : "New agent"}
          </Button>
        }
      />
      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <Glass className="p-6">
              <AgentForm submitLabel="Create agent" onSubmit={(v) => create.mutate(v)} pending={create.isPending} error={create.error} />
            </Glass>
          </motion.div>
        )}
      </AnimatePresence>
      {agents.isLoading ? (
        <LoadingBlock rows={4} />
      ) : agents.error ? (
        <ErrorBox error={agents.error} onRetry={() => agents.refetch()} />
      ) : !agents.data?.agents.length ? (
        <Empty icon={<Bot className="h-5 w-5" />} title="No agents yet" body="Create your first agent to start delegating work." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {agents.data.agents.map((a) => (
            <Link key={a.id} href={`/app/${orgId}/agents/${a.id}`}>
              <Glass className="h-full p-5 transition hover:-translate-y-0.5">
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${a.isOrchestrator ? "border-lime/30 bg-lime/10 text-lime" : "border-line bg-white/[0.03] text-mist"}`}>
                    {a.isOrchestrator ? <Crown className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{a.name}</p>
                      <StatusPill status={a.status} />
                    </div>
                    <p className="text-xs text-mist">
                      {a.role} · {a.department}
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-mist">{a.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Badge>{a.model}</Badge>
                  <Badge tone="lime">{a.tasksCompleted} completed</Badge>
                  {a.tasksFailed > 0 && <Badge tone="danger">{a.tasksFailed} failed</Badge>}
                  <Badge>{usd(a.costMicros ?? 0)} spent</Badge>
                </div>
              </Glass>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
