"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { ActivityEvent } from "@/lib/types";

const dot: Record<string, string> = {
  "task.completed": "bg-lime",
  "order.settled": "bg-lime",
  "task.failed": "bg-danger",
  "order.disputed": "bg-danger",
  "approval.requested": "bg-warn",
  "task.running": "bg-info",
  "task.delegated": "bg-info",
};

/** Persisted history merged with the live SSE stream. */
export function ActivityFeed({ orgId, live, connected, limit = 30 }: { orgId: string; live: ActivityEvent[]; connected: boolean; limit?: number }) {
  const history = useQuery({ queryKey: ["activity", orgId], queryFn: () => api<{ events: ActivityEvent[] }>(`/orgs/${orgId}/activity`) });
  const seen = new Set<number>();
  const merged = [...live, ...(history.data?.events ?? [])].filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true))).slice(0, limit);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display font-semibold">Live activity</p>
        <span className={`flex items-center gap-1.5 text-xs ${connected ? "text-lime" : "text-dim"}`}>
          <Radio className="h-3.5 w-3.5" /> {connected ? "Streaming" : "Connecting…"}
        </span>
      </div>
      {history.isLoading ? (
        <p className="text-sm text-dim">Loading…</p>
      ) : merged.length === 0 ? (
        <p className="text-sm text-dim">No activity yet. Run an objective to see your workforce in action.</p>
      ) : (
        <ul className="space-y-1">
          <AnimatePresence initial={false}>
            {merged.map((e) => (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-white/[0.03]"
              >
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot[e.type] ?? "bg-mist"}`} />
                <span className="flex-1 text-frost/90">{e.summary}</span>
                <span className="shrink-0 text-xs text-dim">{timeAgo(e.createdAt)}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
