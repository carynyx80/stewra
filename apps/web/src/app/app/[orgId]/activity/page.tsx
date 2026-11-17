"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { ActivityFeed } from "@/components/ActivityFeed";
import { api } from "@/lib/api";
import { fmtDate, shortAddr } from "@/lib/format";
import { useActivityStream, useOrg } from "@/lib/hooks";

interface Log {
  id: string;
  actorType: string;
  actorId: string;
  action: string;
  target: string | null;
  createdAt: string;
}

export default function ActivityPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const [tab, setTab] = useState<"live" | "audit">("live");
  const org = useOrg(orgId);
  const stream = useActivityStream(orgId);
  const canAudit = org.data?.role === "OWNER" || org.data?.role === "ADMIN";
  const audit = useQuery({ queryKey: ["audit", orgId], queryFn: () => api<{ logs: Log[] }>(`/orgs/${orgId}/audit`), enabled: tab === "audit" && canAudit });
  const memberAddr = (userId: string) => org.data?.org.members.find((m) => (m as unknown as { userId: string }).userId === userId)?.user.address;

  return (
    <div>
      <SectionTitle
        eyebrow="Activity logs"
        title="Everything that happened"
        body="The live feed streams over server-sent events. The audit log records who did what, for admins."
        action={
          <div className="flex gap-1 rounded-xl border border-line p-1 text-sm">
            <button onClick={() => setTab("live")} className={`rounded-lg px-3 py-1 ${tab === "live" ? "bg-white/[0.08] text-frost" : "text-mist"}`}>
              Activity
            </button>
            {canAudit && (
              <button onClick={() => setTab("audit")} className={`rounded-lg px-3 py-1 ${tab === "audit" ? "bg-white/[0.08] text-frost" : "text-mist"}`}>
                Audit log
              </button>
            )}
          </div>
        }
      />
      <Glass className="p-5">
        {tab === "live" ? (
          <ActivityFeed orgId={orgId} live={stream.events} connected={stream.connected} limit={100} />
        ) : audit.isLoading ? (
          <p className="text-sm text-dim">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-dim">
                <tr>
                  <th className="pb-2 font-normal">Time</th>
                  <th className="pb-2 font-normal">Actor</th>
                  <th className="pb-2 font-normal">Action</th>
                  <th className="pb-2 font-normal">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {audit.data?.logs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2 text-mist">{fmtDate(l.createdAt)}</td>
                    <td className="py-2 font-mono text-xs">{l.actorType === "user" ? shortAddr(memberAddr(l.actorId) ?? l.actorId) : `${l.actorType}:${l.actorId.slice(-6)}`}</td>
                    <td className="py-2">{l.action}</td>
                    <td className="py-2 font-mono text-xs text-dim">{l.target ? l.target.slice(-10) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Glass>
    </div>
  );
}
