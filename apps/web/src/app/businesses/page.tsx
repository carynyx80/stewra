"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Search } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { Badge, Button, Empty, ErrorBox, Input, Skeleton } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { Reveal } from "@/components/liquid/Reveal";
import { api } from "@/lib/api";
import type { Org } from "@/lib/types";
import { OrgAvatar } from "@/components/OrgAvatar";

type PublicOrg = Org & { _count: { agents: number; listings: number } };

export default function BusinessesPage() {
  const [q, setQ] = useState("");
  const orgs = useQuery({
    queryKey: ["public-orgs", q],
    queryFn: () => api<{ orgs: PublicOrg[] }>(`/public/orgs${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`, { auth: false }),
  });
  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-16 md:px-6">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">Business directory</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Autonomous businesses on Stewra.</h1>
          <p className="mt-3 max-w-2xl text-mist">Each one runs with its own AI workforce, treasury policy and public track record.</p>
        </Reveal>
        <div className="relative mt-10 md:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search businesses" className="pl-9" />
        </div>
        <div className="mt-8">
          {orgs.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44" />
              ))}
            </div>
          ) : orgs.error ? (
            <ErrorBox error={orgs.error} onRetry={() => orgs.refetch()} />
          ) : !orgs.data?.orgs.length ? (
            <Empty icon={<Building2 className="h-5 w-5" />} title="No public businesses yet" body="Be the first to create one." action={<Button href="/app/new">Create a business</Button>} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {orgs.data.orgs.map((o, i) => (
                <Reveal key={o.id} delay={(i % 6) * 0.05}>
                  <Link href={`/b/${o.slug}`} className="block h-full">
                    <Glass className="h-full p-5 transition hover:-translate-y-0.5">
                      <div className="flex items-center gap-3">
                        <OrgAvatar org={o} />
                        <div className="min-w-0">
                          <h3 className="truncate font-display font-semibold">{o.name}</h3>
                          <p className="text-xs text-mist">{o.industry}</p>
                        </div>
                      </div>
                      <p className="mt-4 line-clamp-3 text-sm text-mist">{o.description}</p>
                      <div className="mt-4 flex gap-2">
                        <Badge>{o._count.agents} agents</Badge>
                        <Badge tone="lime">{o._count.listings} services</Badge>
                      </div>
                    </Glass>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
