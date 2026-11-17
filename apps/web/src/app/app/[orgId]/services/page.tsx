"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Plus, Store, X } from "lucide-react";
import { Badge, Button, Empty, ErrorBox, Field, Input, LoadingBlock, SectionTitle, Select, Textarea, Toggle } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { api } from "@/lib/api";
import { fromUnits } from "@/lib/format";
import { useMeta } from "@/lib/hooks";
import type { Agent, Listing } from "@/lib/types";

export default function ServicesPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const qc = useQueryClient();
  const meta = useMeta();
  const [open, setOpen] = useState(false);
  const listings = useQuery({ queryKey: ["listings", orgId], queryFn: () => api<{ listings: Listing[] }>(`/orgs/${orgId}/listings`) });
  const agents = useQuery({ queryKey: ["agents", orgId], queryFn: () => api<{ agents: Agent[] }>(`/orgs/${orgId}/agents`) });
  const d = meta.data?.chain.settlementToken?.decimals ?? 6;
  const sym = meta.data?.chain.settlementToken?.symbol ?? "tUSD";
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api(`/listings/${id}`, { method: "PATCH", body: { active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings", orgId] }),
  });

  return (
    <div>
      <SectionTitle
        eyebrow="Marketplace management"
        title="Services"
        body="Publish services your AI workforce delivers. Start with objectively reviewable work: research reports, documents, code and data transformation."
        action={
          <Button onClick={() => setOpen(!open)} variant={open ? "secondary" : "primary"}>
            {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {open ? "Close" : "New service"}
          </Button>
        }
      />
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <ListingForm
              orgId={orgId}
              agents={agents.data?.agents ?? []}
              categories={meta.data?.categories ?? []}
              symbol={sym}
              onDone={() => {
                setOpen(false);
                qc.invalidateQueries({ queryKey: ["listings", orgId] });
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {listings.isLoading ? (
        <LoadingBlock rows={3} />
      ) : listings.error ? (
        <ErrorBox error={listings.error} />
      ) : !listings.data?.listings.length ? (
        <Empty icon={<Store className="h-5 w-5" />} title="No services yet" body="Publish a service so other businesses and customers can hire your workforce." />
      ) : (
        <div className="space-y-3">
          {listings.data.listings.map((l) => (
            <Glass key={l.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{l.title}</p>
                  <Badge>{l.category}</Badge>
                  {!l.active && <Badge tone="warn">Paused</Badge>}
                </div>
                <p className="mt-1 text-xs text-dim">
                  {fromUnits(l.priceUnits, d)} {sym} · {l.deliveryHours}h · {l._count?.orders ?? 0} orders · fulfilled by {l.agent?.name ?? "the orchestrator"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Toggle checked={l.active} onChange={(active) => toggle.mutate({ id: l.id, active })} label={l.active ? "Active" : "Paused"} />
                <Link href={`/marketplace/${l.id}`} className="text-mist hover:text-lime" aria-label="View public listing">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </Glass>
          ))}
        </div>
      )}
    </div>
  );
}

function ListingForm({ orgId, agents, categories, symbol, onDone }: { orgId: string; agents: Agent[]; categories: string[]; symbol: string; onDone: () => void }) {
  const [v, setV] = useState({ title: "", category: categories[2] ?? "Research", description: "", price: "", inputFormat: "", outputFormat: "", deliveryHours: 24, agentId: "" });
  const create = useMutation({ mutationFn: () => api(`/orgs/${orgId}/listings`, { body: { ...v, agentId: v.agentId || undefined } }), onSuccess: onDone });
  return (
    <Glass className="p-6">
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Field label="Service name" className="md:col-span-2">
          <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} required minLength={3} maxLength={120} placeholder="Market research report" />
        </Field>
        <Field label="Category">
          <Select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label={`Price (${symbol})`}>
          <Input value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} required inputMode="decimal" pattern="^\d+(\.\d+)?$" placeholder="25" />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <Textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} required minLength={20} maxLength={4000} />
        </Field>
        <Field label="Input the customer provides">
          <Input value={v.inputFormat} onChange={(e) => setV({ ...v, inputFormat: e.target.value })} required minLength={2} placeholder="Topic, audience and questions" />
        </Field>
        <Field label="Output delivered">
          <Input value={v.outputFormat} onChange={(e) => setV({ ...v, outputFormat: e.target.value })} required minLength={2} placeholder="Markdown report, 1,500–2,500 words" />
        </Field>
        <Field label="Delivery time (hours)">
          <Input type="number" min={1} max={720} value={v.deliveryHours} onChange={(e) => setV({ ...v, deliveryHours: Number(e.target.value) })} />
        </Field>
        <Field label="Fulfilled by" hint="Leave as orchestrator to let your CEO agent plan and delegate.">
          <Select value={v.agentId} onChange={(e) => setV({ ...v, agentId: e.target.value })}>
            <option value="">Orchestrator (recommended)</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        {create.error && (
          <div className="md:col-span-2">
            <ErrorBox error={create.error} />
          </div>
        )}
        <div className="md:col-span-2">
          <Button type="submit" loading={create.isPending}>
            Publish service
          </Button>
        </div>
      </form>
    </Glass>
  );
}
