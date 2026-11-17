"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pause, Play } from "lucide-react";
import { Badge, Button, ErrorBox, Field, Input, LoadingBlock, SectionTitle, StatusPill, Textarea } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { AgentForm } from "@/components/AgentForm";
import { api } from "@/lib/api";
import { fmtDate, timeAgo, usd } from "@/lib/format";
import type { Agent, Execution, Task } from "@/lib/types";

export default function AgentDetail({ params }: { params: Promise<{ orgId: string; agentId: string }> }) {
  const { orgId, agentId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"activity" | "config" | "assign">("activity");
  const [task, setTask] = useState({ title: "", instructions: "" });

  const q = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => api<{ agent: Agent; tasks: Task[]; executions: Execution[]; memories: { id: string; content: string; createdAt: string }[] }>(`/agents/${agentId}`),
    refetchInterval: 10_000,
  });
  const update = useMutation({
    mutationFn: (body: unknown) => api(`/agents/${agentId}`, { method: "PATCH", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent", agentId] });
      qc.invalidateQueries({ queryKey: ["agents", orgId] });
    },
  });
  const assign = useMutation({
    mutationFn: () => api<{ project: { id: string } }>(`/orgs/${orgId}/tasks`, { body: { agentId, ...task } }),
    onSuccess: (d) => router.push(`/app/${orgId}/projects/${d.project.id}`),
  });

  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? "Not found"} />;
  const { agent, tasks, executions, memories } = q.data;
  const paused = agent.status === "PAUSED";

  return (
    <div>
      <Link href={`/app/${orgId}/agents`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-mist hover:text-frost">
        <ArrowLeft className="h-4 w-4" /> Workforce
      </Link>
      <SectionTitle
        eyebrow={`${agent.role} · ${agent.department}`}
        title={agent.name}
        body={agent.description}
        action={
          <div className="flex items-center gap-2">
            <StatusPill status={agent.status} />
            <Button variant="secondary" size="sm" loading={update.isPending} onClick={() => update.mutate({ status: paused ? "IDLE" : "PAUSED" })}>
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />} {paused ? "Resume" : "Pause"}
            </Button>
          </div>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini k="Completed" v={agent.tasksCompleted} />
        <Mini k="Failed" v={agent.tasksFailed} />
        <Mini k="Model spend (est.)" v={usd(agent.costMicros ?? 0)} />
        <Mini k="Model" v={agent.model} />
      </div>

      <div className="mb-5 flex gap-1 rounded-xl border border-line bg-white/[0.02] p-1 text-sm">
        {(["activity", "config", "assign"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg px-3 py-1.5 capitalize transition ${tab === t ? "bg-white/[0.08] text-frost" : "text-mist hover:text-frost"}`}>
            {t === "assign" ? "Assign task" : t === "config" ? "Configuration" : "Activity"}
          </button>
        ))}
      </div>

      {tab === "activity" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Glass className="p-5">
            <p className="mb-3 font-display font-semibold">Task history</p>
            {tasks.length === 0 ? (
              <p className="text-sm text-dim">No tasks yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {tasks.map((t) => (
                  <li key={t.id}>
                    <Link href={t.projectId ? `/app/${orgId}/projects/${t.projectId}` : "#"} className="flex items-center gap-3 py-2.5 text-sm hover:text-lime">
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                      <span className="text-xs text-dim">{timeAgo(t.createdAt)}</span>
                      <StatusPill status={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Glass>
          <div className="space-y-6">
            <Glass className="p-5">
              <p className="mb-3 font-display font-semibold">Executions</p>
              {executions.length === 0 ? (
                <p className="text-sm text-dim">No executions yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {executions.map((e) => (
                    <li key={e.id} className="rounded-xl border border-line px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-mist">{e.model}</span>
                        <StatusPill status={e.status} />
                      </div>
                      <p className="mt-1 text-xs text-dim">
                        {fmtDate(e.startedAt)} · {e.turns} turns · {e.inputTokens.toLocaleString()} in / {e.outputTokens.toLocaleString()} out · {usd(e.costMicros)}
                      </p>
                      {e.error && <p className="mt-1 text-xs text-danger">{e.error}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Glass>
            <Glass className="p-5">
              <p className="mb-3 font-display font-semibold">Memory</p>
              {memories.length === 0 ? (
                <p className="text-sm text-dim">This agent has not saved any memories.</p>
              ) : (
                <ul className="space-y-2 text-sm text-mist">
                  {memories.map((m) => (
                    <li key={m.id}>— {m.content}</li>
                  ))}
                </ul>
              )}
            </Glass>
          </div>
        </div>
      )}

      {tab === "config" && (
        <Glass className="p-6">
          <AgentForm initial={agent} submitLabel="Save changes" onSubmit={(v) => update.mutate(v)} pending={update.isPending} error={update.error} />
          {update.isSuccess && <p className="mt-3 text-sm text-lime">Saved.</p>}
        </Glass>
      )}

      {tab === "assign" && (
        <Glass className="p-6">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              assign.mutate();
            }}
          >
            <Field label="Task title">
              <Input value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} required minLength={2} maxLength={200} />
            </Field>
            <Field label="Instructions">
              <Textarea value={task.instructions} onChange={(e) => setTask({ ...task, instructions: e.target.value })} required minLength={5} maxLength={20000} />
            </Field>
            {paused && <Badge tone="warn">This agent is paused; resume it first.</Badge>}
            {assign.error && <ErrorBox error={assign.error} />}
            <Button type="submit" loading={assign.isPending} disabled={paused}>
              Assign to {agent.name}
            </Button>
          </form>
        </Glass>
      )}
    </div>
  );
}

function Mini({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-xs text-mist">{k}</p>
      <p className="mt-1.5 truncate font-display text-lg font-semibold">{v}</p>
    </div>
  );
}
