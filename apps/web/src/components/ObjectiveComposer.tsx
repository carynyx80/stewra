"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button, ErrorBox, Notice, Textarea } from "./ui";
import { Glass } from "./liquid/Glass";
import { api } from "@/lib/api";
import { usd } from "@/lib/format";

const examples = [
  "Research the market for AI bookkeeping tools for small agencies and write a 2-page brief with competitors, pricing and positioning.",
  "Create a marketing campaign plan for our product launch: audience, messaging, channels, timeline and success metrics.",
  "Write a landing page specification and copy for our new service, then have it reviewed for clarity.",
];

export function ObjectiveComposer({ orgId }: { orgId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [objective, setObjective] = useState("");
  const [result, setResult] = useState<{ needsApproval: boolean; estimateMicros: number; providerConfigured: boolean; projectId: string } | null>(null);

  const run = useMutation({
    mutationFn: () => api<{ project: { id: string }; needsApproval: boolean; estimateMicros: number; providerConfigured: boolean }>(`/orgs/${orgId}/objectives`, { body: { objective } }),
    onSuccess: (d) => {
      setResult({ needsApproval: d.needsApproval, estimateMicros: d.estimateMicros, providerConfigured: d.providerConfigured, projectId: d.project.id });
      setObjective("");
      qc.invalidateQueries({ queryKey: ["overview", orgId] });
      qc.invalidateQueries({ queryKey: ["projects", orgId] });
      if (!d.needsApproval) router.push(`/app/${orgId}/projects/${d.project.id}`);
    },
  });

  return (
    <Glass className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-lime" />
        <p className="font-display font-semibold">Give your business an objective</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run.mutate();
        }}
      >
        <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What should your organization accomplish?" className="min-h-24" maxLength={8000} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {examples.map((ex, i) => (
              <button key={i} type="button" onClick={() => setObjective(ex)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-mist transition hover:border-lime/40 hover:text-frost">
                Example {i + 1}
              </button>
            ))}
          </div>
          <Button type="submit" loading={run.isPending} disabled={objective.trim().length < 10}>
            Run objective
          </Button>
        </div>
      </form>
      {run.error && <div className="mt-3"><ErrorBox error={run.error} /></div>}
      {result?.needsApproval && (
        <div className="mt-3">
          <Notice tone="warn">
            Estimated cost {usd(result.estimateMicros)} is above your per-run cap, so this objective is waiting in the approval inbox.
          </Notice>
        </div>
      )}
      {result && !result.providerConfigured && (
        <div className="mt-3">
          <Notice tone="warn">No model provider is configured on the API, so this task will fail with a clear error until ANTHROPIC_API_KEY is set.</Notice>
        </div>
      )}
    </Glass>
  );
}
