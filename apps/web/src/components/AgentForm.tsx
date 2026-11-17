"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, ErrorBox, Field, Input, Select, Textarea, Toggle } from "./ui";
import { api } from "@/lib/api";
import type { Agent } from "@/lib/types";

interface TemplatesMeta {
  models: { id: string; label: string }[];
  efforts: string[];
  tools: string[];
}

export interface AgentFormValues {
  name: string;
  role: string;
  department: string;
  description: string;
  model: string;
  effort: string;
  systemPrompt: string;
  tools: string[];
  isOrchestrator: boolean;
  isPublic: boolean;
}

const toolHelp: Record<string, string> = {
  delegate_task: "Assign work to other agents (orchestrators only)",
  search_knowledge: "Search the organization knowledge base",
  submit_deliverable: "Save finished work",
  save_memory: "Keep durable notes for future tasks",
  request_approval: "Ask a human to authorize a sensitive action",
};

export function AgentForm({ initial, submitLabel, onSubmit, pending, error }: { initial?: Partial<Agent>; submitLabel: string; onSubmit: (v: AgentFormValues) => void; pending: boolean; error: unknown }) {
  const meta = useQuery({ queryKey: ["templates"], queryFn: () => api<TemplatesMeta>("/templates", { auth: false }) });
  const [v, setV] = useState<AgentFormValues>({
    name: initial?.name ?? "",
    role: initial?.role ?? "",
    department: initial?.department ?? "Operations",
    description: initial?.description ?? "",
    model: initial?.model ?? "claude-opus-5-5",
    effort: initial?.effort ?? "medium",
    systemPrompt: initial?.systemPrompt ?? "",
    tools: initial?.tools ?? ["search_knowledge", "submit_deliverable"],
    isOrchestrator: initial?.isOrchestrator ?? false,
    isPublic: initial?.isPublic ?? true,
  });
  const set = <K extends keyof AgentFormValues>(k: K, val: AgentFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={v.name} onChange={(e) => set("name", e.target.value)} required minLength={2} maxLength={80} />
        </Field>
        <Field label="Role">
          <Input value={v.role} onChange={(e) => set("role", e.target.value)} required minLength={2} maxLength={60} placeholder="Researcher" />
        </Field>
        <Field label="Department">
          <Input value={v.department} onChange={(e) => set("department", e.target.value)} required minLength={2} maxLength={60} />
        </Field>
        <Field label="Model">
          <Select value={v.model} onChange={(e) => set("model", e.target.value)}>
            {(meta.data?.models ?? [{ id: v.model, label: v.model }]).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Effort" hint="Higher effort thinks longer and costs more.">
          <Select value={v.effort} onChange={(e) => set("effort", e.target.value)}>
            {(meta.data?.efforts ?? ["low", "medium", "high"]).map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Description" hint="Shown publicly and to other agents.">
        <Textarea value={v.description} onChange={(e) => set("description", e.target.value)} required minLength={5} maxLength={1000} className="min-h-20" />
      </Field>
      <Field label="Instructions" hint="Private system instructions for this agent. Never shown publicly or in the activity feed.">
        <Textarea value={v.systemPrompt} onChange={(e) => set("systemPrompt", e.target.value)} required minLength={10} maxLength={8000} />
      </Field>
      <div>
        <p className="mb-2 text-[13px] font-medium text-mist">Tools</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(meta.data?.tools ?? Object.keys(toolHelp)).map((t) => {
            const on = v.tools.includes(t);
            return (
              <button
                type="button"
                key={t}
                onClick={() => set("tools", on ? v.tools.filter((x) => x !== t) : [...v.tools, t])}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${on ? "border-lime/50 bg-lime/[0.06]" : "border-line hover:border-line-strong"}`}
              >
                <code className={`font-mono text-xs ${on ? "text-lime" : "text-mist"}`}>{t}</code>
                <p className="mt-0.5 text-xs text-dim">{toolHelp[t]}</p>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-dim">No tool can move funds. Granting tools requires the owner role.</p>
      </div>
      <div className="flex flex-wrap gap-6">
        <Toggle checked={v.isOrchestrator} onChange={(x) => set("isOrchestrator", x)} label="Orchestrator (can delegate)" />
        <Toggle checked={v.isPublic} onChange={(x) => set("isPublic", x)} label="Show on public profile" />
      </div>
      {Boolean(error) && <ErrorBox error={error} />}
      <Button type="submit" loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
