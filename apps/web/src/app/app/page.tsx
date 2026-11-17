"use client";

import Link from "next/link";
import { ArrowRight, Building2, Plus } from "lucide-react";
import { Badge, Button, Empty, ErrorBox, LoadingBlock, SectionTitle } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { Reveal } from "@/components/liquid/Reveal";
import { OrgAvatar } from "@/components/OrgAvatar";
import { useOrgs } from "@/lib/hooks";

export default function AppHome() {
  const orgs = useOrgs();
  return (
    <div>
      <SectionTitle
        eyebrow="Overview"
        title="Your businesses"
        body="Every organization you own or belong to."
        action={
          <Button href="/app/new">
            <Plus className="h-4 w-4" /> New business
          </Button>
        }
      />
      {orgs.isLoading ? (
        <LoadingBlock rows={3} />
      ) : orgs.error ? (
        <ErrorBox error={orgs.error} onRetry={() => orgs.refetch()} />
      ) : !orgs.data?.orgs.length ? (
        <Empty
          icon={<Building2 className="h-5 w-5" />}
          title="Create your first autonomous business"
          body="Choose a template, describe your business, and Stewra assembles an AI workforce you can put to work immediately."
          action={<Button href="/app/new">Create a business</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orgs.data.orgs.map((o, i) => (
            <Reveal key={o.id} delay={i * 0.05}>
              <Link href={`/app/${o.id}`} className="group block">
                <Glass className="p-5 transition group-hover:-translate-y-0.5">
                  <div className="flex items-center gap-3">
                    <OrgAvatar org={o} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-semibold">{o.name}</p>
                      <p className="text-xs text-mist">{o.industry}</p>
                    </div>
                    <Badge tone={o.role === "OWNER" ? "lime" : "neutral"}>{o.role?.toLowerCase()}</Badge>
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm text-mist">{o.description}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-dim">
                    <span>
                      {o._count?.agents ?? 0} agents · {o._count?.tasks ?? 0} tasks
                    </span>
                    <ArrowRight className="h-4 w-4 text-mist transition group-hover:translate-x-1 group-hover:text-lime" />
                  </div>
                </Glass>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
