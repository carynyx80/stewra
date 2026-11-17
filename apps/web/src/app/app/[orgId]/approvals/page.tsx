"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckSquare, Clock } from "lucide-react";
import { Button, Empty, ErrorBox, Input, LoadingBlock, SectionTitle, StatusPill } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { api } from "@/lib/api";
import { fmtDate, fromUnits, timeAgo } from "@/lib/format";
import { useMeta } from "@/lib/hooks";
import type { Approval } from "@/lib/types";

export default function ApprovalsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const [filter, setFilter] = useState<"PENDING" | "">("PENDING");
  const meta = useMeta();
  const decimals = meta.data?.chain.settlementToken?.decimals ?? 6;
  const symbol = meta.data?.chain.settlementToken?.symbol ?? "tUSD";
  const q = useQuery({
    queryKey: ["approvals", orgId, filter],
    queryFn: () => api<{ approvals: Approval[] }>(`/orgs/${orgId}/approvals${filter ? `?status=${filter}` : ""}`),
    refetchInterval: 15_000,
  });

  return (
    <div>
      <SectionTitle
        eyebrow="Human control"
        title="Approval inbox"
        body="Actions your agents cannot take on their own. Decisions are enforced by the API."
        action={
          <div className="flex gap-1 rounded-xl border border-line p-1 text-sm">
            {[
              ["PENDING", "Pending"],
              ["", "All"],
            ].map(([v, l]) => (
              <button key={l} onClick={() => setFilter(v as "PENDING" | "")} className={`rounded-lg px-3 py-1 ${filter === v ? "bg-white/[0.08] text-frost" : "text-mist"}`}>
                {l}
              </button>
            ))}
          </div>
        }
      />
      {q.isLoading ? (
        <LoadingBlock rows={3} />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.approvals.length ? (
        <Empty icon={<CheckSquare className="h-5 w-5" />} title={filter ? "Nothing waiting for you" : "No approval requests yet"} body="Spending, hiring and over-budget objectives appear here." />
      ) : (
        <div className="space-y-3">
          {q.data.approvals.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <ApprovalCard a={a} orgId={orgId} decimals={decimals} symbol={symbol} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ a, orgId, decimals, symbol }: { a: Approval; orgId: string; decimals: number; symbol: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const decide = useMutation({
    mutationFn: (decision: string) => api(`/approvals/${a.id}/decide`, { body: { decision, note: note || undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals", orgId] });
      qc.invalidateQueries({ queryKey: ["overview", orgId] });
    },
  });
  const pending = a.status === "PENDING";
  return (
    <Glass className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold">{a.action}</p>
          <p className="text-xs text-dim">
            {a.agent ? `Requested by ${a.agent.name}` : "Requested by the platform"} · {timeAgo(a.createdAt)}
          </p>
        </div>
        <StatusPill status={a.status} />
      </div>
      <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Item k="Reason" v={a.reason} />
        <Item k="Expected consequences" v={a.consequences} />
        {a.amount && <Item k="Amount" v={/^\d+$/.test(a.amount) ? `${fromUnits(a.amount, decimals)} ${symbol}` : a.amount} />}
        {a.destination && <Item k="Destination" v={a.destination} />}
      </dl>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-dim">
        <Clock className="h-3.5 w-3.5" /> {pending ? `Expires ${fmtDate(a.expiresAt)}` : a.decidedAt ? `Decided ${fmtDate(a.decidedAt)}` : ""}
        {a.decisionNote && ` · “${a.decisionNote}”`}
      </p>
      {pending && (
        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 md:flex-row md:items-center">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="md:flex-1" maxLength={2000} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" loading={decide.isPending && decide.variables === "APPROVED"} onClick={() => decide.mutate("APPROVED")}>
              Approve
            </Button>
            <Button size="sm" variant="secondary" loading={decide.isPending && decide.variables === "CHANGES_REQUESTED"} onClick={() => decide.mutate("CHANGES_REQUESTED")}>
              Request changes
            </Button>
            <Button size="sm" variant="danger" loading={decide.isPending && decide.variables === "REJECTED"} onClick={() => decide.mutate("REJECTED")}>
              Reject
            </Button>
          </div>
        </div>
      )}
      {decide.error && <div className="mt-3"><ErrorBox error={decide.error} /></div>}
    </Glass>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] p-3">
      <dt className="text-xs text-mist">{k}</dt>
      <dd className="mt-1 break-words text-frost/90">{v}</dd>
    </div>
  );
}
