"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban } from "lucide-react";
import { Badge, Empty, ErrorBox, LoadingBlock, SectionTitle, StatusPill } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { ObjectiveComposer } from "@/components/ObjectiveComposer";
import { api } from "@/lib/api";
import { timeAgo, usd } from "@/lib/format";
import type { Project } from "@/lib/types";

export default function ProjectsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const q = useQuery({ queryKey: ["projects", orgId], queryFn: () => api<{ projects: Project[] }>(`/orgs/${orgId}/projects`), refetchInterval: 15_000 });
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Projects & tasks" title="Projects" body="Every objective, direct task and customer order becomes a project with its own task tree." />
      <ObjectiveComposer orgId={orgId} />
      {q.isLoading ? (
        <LoadingBlock rows={4} />
      ) : q.error ? (
        <ErrorBox error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.projects.length ? (
        <Empty icon={<FolderKanban className="h-5 w-5" />} title="No projects yet" body="Run an objective above to create your first project." />
      ) : (
        <div className="space-y-2">
          {q.data.projects.map((p) => (
            <Link key={p.id} href={`/app/${orgId}/projects/${p.id}`} className="block">
              <Glass className="flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-xs text-dim">
                    {timeAgo(p.createdAt)} · {p.completedCount}/{p.taskCount} tasks · {usd(p.costMicros ?? 0)}
                  </p>
                </div>
                {p.orderId && <Badge tone="info">Customer order</Badge>}
                <StatusPill status={p.status} />
              </Glass>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
