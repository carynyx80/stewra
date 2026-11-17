"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bot, Check, Crown } from "lucide-react";
import { Button, ErrorBox, Field, Input, LoadingBlock, SectionTitle, Textarea, Toggle } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { api } from "@/lib/api";
import type { Org } from "@/lib/types";

interface TemplateAgent {
  name: string;
  role: string;
  department: string;
  description: string;
  isOrchestrator?: boolean;
  tools: string[];
}
interface Template {
  id: string;
  name: string;
  industry: string;
  summary: string;
  agents: TemplateAgent[];
}

const steps = ["Template", "Business", "Workforce", "Review"];

export default function CreateBusiness() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState("");
  const [form, setForm] = useState({ name: "", industry: "", description: "", logoUrl: "", objectives: "", published: true });
  const [roles, setRoles] = useState<string[]>([]);

  const templates = useQuery({ queryKey: ["templates"], queryFn: () => api<{ templates: Template[] }>("/templates", { auth: false }) });
  const template = useMemo(() => templates.data?.templates.find((t) => t.id === templateId), [templates.data, templateId]);

  useEffect(() => {
    if (template) {
      setRoles(template.agents.map((a) => a.role));
      setForm((f) => ({ ...f, industry: f.industry || template.industry }));
    }
  }, [template]);

  const create = useMutation({
    mutationFn: () => api<{ org: Org }>("/orgs", { body: { ...form, template: templateId, agentRoles: roles, logoUrl: form.logoUrl || undefined } }),
    onSuccess: ({ org }) => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      router.push(`/app/${org.id}`);
    },
  });

  const canNext =
    (step === 0 && Boolean(templateId)) ||
    (step === 1 && form.name.trim().length >= 2 && form.industry.trim().length >= 2 && form.description.trim().length >= 10) ||
    (step === 2 && roles.some((r) => template?.agents.find((a) => a.role === r)?.isOrchestrator)) ||
    step === 3;

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle eyebrow="New business" title="Create an autonomous business" />
      <div className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition ${i < step ? "border-lime bg-lime text-void" : i === step ? "border-lime text-lime" : "border-line-strong text-dim"}`}>
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`hidden text-xs sm:inline ${i === step ? "text-frost" : "text-dim"}`}>{s}</span>
            {i < steps.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-lime/60" : "bg-line-strong"}`} />}
          </div>
        ))}
      </div>

      <div className="overflow-x-clip px-1 -mx-1">
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 24, filter: "blur(6px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} exit={{ opacity: 0, x: -24, filter: "blur(6px)" }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          {step === 0 &&
            (templates.isLoading ? (
              <LoadingBlock rows={4} />
            ) : templates.error ? (
              <ErrorBox error={templates.error} onRetry={() => templates.refetch()} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {templates.data!.templates.map((t) => (
                  <button key={t.id} onClick={() => setTemplateId(t.id)} className="text-left">
                    <Glass className={`h-full p-5 transition ${templateId === t.id ? "!border-lime/60 shadow-[0_0_0_4px_rgba(182,218,52,0.12)]" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-display font-semibold">{t.name}</p>
                        {templateId === t.id && <Check className="h-4 w-4 text-lime" />}
                      </div>
                      <p className="mt-1.5 text-sm text-mist">{t.summary}</p>
                      <p className="mt-3 text-xs text-dim">{t.agents.length} agents</p>
                    </Glass>
                  </button>
                ))}
              </div>
            ))}

          {step === 1 && (
            <Glass className="space-y-5 p-6">
              <Field label="Business name">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nova Creative Labs" maxLength={80} />
              </Field>
              <Field label="Industry">
                <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Digital Marketing" maxLength={60} />
              </Field>
              <Field label="Description" hint="What the business does and for whom. Agents read this as context.">
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="An autonomous marketing agency offering research, content writing, design and campaign planning." maxLength={2000} />
              </Field>
              <Field label="Operating objectives (optional)" hint="Standing goals your agents keep in mind.">
                <Textarea value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} className="min-h-20" maxLength={2000} />
              </Field>
              <Field label="Logo URL (optional)" hint="A link to a square image. File uploads are planned.">
                <Input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://…" type="url" />
              </Field>
              <Toggle checked={form.published} onChange={(v) => setForm({ ...form, published: v })} label="Publish a public business profile" />
            </Glass>
          )}

          {step === 2 && template && (
            <div className="space-y-3">
              <p className="text-sm text-mist">Choose the agents to start with. You need an orchestrator to run objectives. You can add and edit agents later.</p>
              {template.agents.map((a) => {
                const on = roles.includes(a.role);
                return (
                  <button key={a.role} className="block w-full text-left" onClick={() => setRoles(on ? roles.filter((r) => r !== a.role) : [...roles, a.role])}>
                    <Glass className={`flex items-start gap-4 p-4 transition ${on ? "!border-lime/50" : "opacity-60"}`}>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${a.isOrchestrator ? "border-lime/30 bg-lime/10 text-lime" : "border-line bg-white/[0.03] text-mist"}`}>
                        {a.isOrchestrator ? <Crown className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">
                          {a.name} <span className="text-xs text-dim">· {a.department}</span>
                        </p>
                        <p className="mt-0.5 text-sm text-mist">{a.description}</p>
                      </div>
                      <span className={`mt-1 flex h-5 w-5 items-center justify-center rounded-md border ${on ? "border-lime bg-lime text-void" : "border-line-strong"}`}>{on && <Check className="h-3 w-3" />}</span>
                    </Glass>
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && template && (
            <Glass className="space-y-4 p-6 text-sm">
              <Row k="Template" v={template.name} />
              <Row k="Name" v={form.name} />
              <Row k="Industry" v={form.industry} />
              <Row k="Public profile" v={form.published ? "Yes" : "No"} />
              <Row k="Agents" v={template.agents.filter((a) => roles.includes(a.role)).map((a) => a.name).join(", ")} />
              <p className="border-t border-line pt-4 text-xs text-dim">
                Defaults: every purchase needs owner approval, the daily spend cap is 0 and each agent run is capped at $2.00 of estimated model cost. Change these in Treasury.
              </p>
              {create.error && <ErrorBox error={create.error} />}
            </Glass>
          )}
        </motion.div>
      </AnimatePresence>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => create.mutate()} loading={create.isPending}>
            Create business
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-6">
      <span className="w-32 shrink-0 text-mist">{k}</span>
      <span className="text-frost">{v}</span>
    </div>
  );
}
