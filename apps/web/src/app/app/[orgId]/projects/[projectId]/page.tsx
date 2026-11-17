"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bot, ChevronDown, FileText, RotateCcw, Square, Wrench } from "lucide-react";
import { Badge, Button, ErrorBox, LoadingBlock, Markdown, Notice, SectionTitle, StatusPill } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { api } from "@/lib/api";
import { useActivityStream } from "@/lib/hooks";
import { fmtDate, timeAgo, usd } from "@/lib/format";
import type { AgentMessage, Deliverable, Project, Task } from "@/lib/types";

interface ProjectData {
  project: Project;
  tasks: Task[];
  messages: AgentMessage[];
  deliverables: Deliverable[];
}

const ACTIVE = ["QUEUED", "RUNNING", "WAITING_ON_DEPENDENCY", "PENDING_APPROVAL"];

export default function ProjectDetail({ params }: { params: Promise<{ orgId: string; projectId: string }> }) {
  const { orgId, projectId } = use(params);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api<ProjectData>(`/projects/${projectId}`),
    refetchInterval: (query) => (query.state.data?.tasks.some((t) => ACTIVE.includes(t.status)) ? 4000 : false),
  });
  useActivityStream(orgId, () => qc.invalidateQueries({ queryKey: ["project", projectId] }));
  const [selected, setSelected] = useState<string | null>(null);

  const cancel = useMutation({ mutationFn: (id: string) => api(`/tasks/${id}/cancel`, { method: "POST" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }) });
  const retry = useMutation({ mutationFn: (id: string) => api(`/tasks/${id}/retry`, { method: "POST" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }) });

  const root = useMemo(() => q.data?.tasks.find((t) => !t.parentTaskId), [q.data]);
  if (q.isLoading) return <LoadingBlock rows={5} />;
  if (q.error || !q.data) return <ErrorBox error={q.error ?? "Not found"} />;
  const { project, tasks, messages, deliverables } = q.data;
  const subtasks = tasks.filter((t) => t.parentTaskId);
  const finalDeliverable = root?.status === "COMPLETED" ? root.output : null;
  const totalCost = tasks.reduce((s, t) => s + t.costMicros, 0);
  const focus = tasks.find((t) => t.id === selected) ?? root;
  const focusMessages = messages.filter((m) => m.taskId === focus?.id);
  const anyMock = tasks.some((t) => t.isMock);

  return (
    <div>
      <Link href={`/app/${orgId}/projects`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-mist hover:text-frost">
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>
      <SectionTitle
        eyebrow={project.orderId ? "Customer order" : "Project"}
        title={project.title}
        body={`Started ${fmtDate(project.createdAt)} · ${tasks.length} tasks · ${usd(totalCost)} estimated model cost`}
        action={<StatusPill status={project.status} />}
      />
      {anyMock && (
        <div className="mb-4">
          <Notice tone="warn">Some output on this page was produced in local mock mode and is not real agent work.</Notice>
        </div>
      )}

      {/* Execution graph */}
      <Glass className="mb-6 p-5">
        <p className="mb-4 font-display font-semibold">Execution</p>
        {root ? (
          <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
            <TaskNode task={root} active={focus?.id === root.id} onClick={() => setSelected(root.id)} lead />
            {subtasks.length > 0 && <ArrowRight className="hidden h-4 w-4 shrink-0 text-dim md:block" />}
            {subtasks.length > 0 && (
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                {subtasks.map((t) => (
                  <TaskNode key={t.id} task={t} active={focus?.id === t.id} onClick={() => setSelected(t.id)} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-dim">No tasks.</p>
        )}
      </Glass>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Focused task */}
        {focus && (
          <Glass className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold">{focus.title}</p>
                <p className="text-xs text-dim">
                  {focus.agent?.name ?? "Unassigned"} · attempt {focus.attempts} · {focus.inputTokens.toLocaleString()} in / {focus.outputTokens.toLocaleString()} out · {usd(focus.costMicros)}
                </p>
              </div>
              <div className="flex gap-2">
                {ACTIVE.includes(focus.status) && (
                  <Button size="sm" variant="danger" loading={cancel.isPending} onClick={() => cancel.mutate(focus.id)}>
                    <Square className="h-3 w-3" /> Cancel
                  </Button>
                )}
                {["FAILED", "CANCELLED"].includes(focus.status) && (
                  <Button size="sm" variant="secondary" loading={retry.isPending} onClick={() => retry.mutate(focus.id)}>
                    <RotateCcw className="h-3 w-3" /> Retry
                  </Button>
                )}
              </div>
            </div>
            {(cancel.error || retry.error) && <div className="mt-3"><ErrorBox error={cancel.error ?? retry.error} /></div>}
            {focus.error && (
              <div className="mt-4">
                <ErrorBox error={focus.error} />
              </div>
            )}
            <Collapsible title="Instructions">
              <p className="whitespace-pre-wrap text-sm text-mist">{focus.instructions}</p>
            </Collapsible>
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-mist">Agent log</p>
              {focusMessages.length === 0 ? (
                <p className="text-sm text-dim">{ACTIVE.includes(focus.status) ? "Waiting for the agent…" : "No messages."}</p>
              ) : (
                <ul className="space-y-2">
                  {focusMessages.map((m) => (
                    <MessageRow key={m.id} m={m} />
                  ))}
                </ul>
              )}
            </div>
            {focus.output && focus.id !== root?.id && (
              <Collapsible title="Output" defaultOpen>
                <Markdown>{focus.output}</Markdown>
              </Collapsible>
            )}
          </Glass>
        )}

        {/* Deliverables */}
        <div className="space-y-6">
          <Glass className="p-5">
            <p className="mb-3 font-display font-semibold">Deliverables</p>
            {deliverables.length === 0 ? (
              <p className="text-sm text-dim">Nothing delivered yet.</p>
            ) : (
              <ul className="space-y-2">
                {deliverables.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-lime" />
                    <span className="min-w-0 flex-1 truncate">{d.title}</span>
                    {d.isMock && <Badge tone="warn">Mock</Badge>}
                    <span className="text-xs text-dim">{timeAgo(d.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Glass>
        </div>
      </div>

      {finalDeliverable && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <Glass className="p-6 md:p-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-lime">Final deliverable</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const blob = new Blob([finalDeliverable], { type: "text/markdown" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `${project.title.slice(0, 40).replace(/[^a-z0-9]+/gi, "-")}.md`;
                  a.click();
                }}
              >
                Download .md
              </Button>
            </div>
            <Markdown>{finalDeliverable}</Markdown>
          </Glass>
        </motion.div>
      )}
    </div>
  );
}

function TaskNode({ task, active, onClick, lead }: { task: Task; active: boolean; onClick: () => void; lead?: boolean }) {
  return (
    <button onClick={onClick} className={`rounded-2xl border p-3 text-left transition md:min-w-56 ${active ? "border-lime/60 bg-lime/[0.06]" : "border-line hover:border-line-strong"} ${lead ? "md:w-64" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-mist">
          <Bot className="h-3.5 w-3.5" /> {task.agent?.name ?? "—"}
        </span>
        <StatusPill status={task.status} />
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm font-medium">{task.title}</p>
    </button>
  );
}

function MessageRow({ m }: { m: AgentMessage }) {
  if (m.kind === "tool_call") {
    let parsed: { tool: string; ok: boolean; summary: string } | null = null;
    try {
      parsed = JSON.parse(m.content);
    } catch {
      /* ignore */
    }
    return (
      <li className="flex items-start gap-2 rounded-lg bg-white/[0.02] px-3 py-2 text-xs">
        <Wrench className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${parsed?.ok ? "text-lime" : "text-danger"}`} />
        <span className="font-mono text-mist">{parsed?.tool}</span>
        <span className="flex-1 text-dim">{parsed?.summary}</span>
      </li>
    );
  }
  return (
    <li className="rounded-lg border border-line px-3 py-2 text-sm">
      <p className="mb-1 text-[11px] uppercase tracking-wider text-dim">{m.kind === "delegation" ? "Delegated brief" : "Agent note"} · {timeAgo(m.createdAt)}</p>
      <div className="max-h-60 overflow-y-auto">
        <Markdown>{m.content}</Markdown>
      </div>
    </li>
  );
}

function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-4 rounded-xl border border-line">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-mist">
        {title}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-line px-3 py-3">{children}</div>}
    </div>
  );
}
