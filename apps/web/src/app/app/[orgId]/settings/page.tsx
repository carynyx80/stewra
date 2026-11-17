"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Badge, Button, ErrorBox, Field, Input, LoadingBlock, SectionTitle, Select, Textarea, Toggle } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { api } from "@/lib/api";
import { shortAddr } from "@/lib/format";
import { useOrg } from "@/lib/hooks";

export default function SettingsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const qc = useQueryClient();
  const org = useOrg(orgId);
  const [v, setV] = useState({ name: "", industry: "", description: "", objectives: "", logoUrl: "", published: true });
  const [member, setMember] = useState({ address: "", role: "MEMBER" });

  useEffect(() => {
    const o = org.data?.org;
    if (o) setV({ name: o.name, industry: o.industry, description: o.description, objectives: o.objectives, logoUrl: o.logoUrl ?? "", published: o.published });
  }, [org.data]);

  const save = useMutation({
    mutationFn: () => api(`/orgs/${orgId}`, { method: "PATCH", body: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org", orgId] });
      qc.invalidateQueries({ queryKey: ["orgs"] });
    },
  });
  const addMember = useMutation({
    mutationFn: () => api(`/orgs/${orgId}/members`, { body: member }),
    onSuccess: () => {
      setMember({ address: "", role: "MEMBER" });
      qc.invalidateQueries({ queryKey: ["org", orgId] });
    },
  });

  if (org.isLoading) return <LoadingBlock rows={4} />;
  if (org.error || !org.data) return <ErrorBox error={org.error ?? "Not found"} />;
  const canEdit = org.data.role !== "MEMBER";

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Settings"
        title="Organization settings"
        action={
          v.published && (
            <Link href={`/b/${org.data.org.slug}`} className="inline-flex items-center gap-1.5 text-sm text-lime hover:underline">
              Public profile <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Glass className="p-6">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <Field label="Name">
              <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} disabled={!canEdit} minLength={2} maxLength={80} />
            </Field>
            <Field label="Industry">
              <Input value={v.industry} onChange={(e) => setV({ ...v, industry: e.target.value })} disabled={!canEdit} />
            </Field>
            <Field label="Description">
              <Textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} disabled={!canEdit} />
            </Field>
            <Field label="Operating objectives">
              <Textarea value={v.objectives} onChange={(e) => setV({ ...v, objectives: e.target.value })} disabled={!canEdit} className="min-h-20" />
            </Field>
            <Field label="Logo URL">
              <Input value={v.logoUrl} onChange={(e) => setV({ ...v, logoUrl: e.target.value })} disabled={!canEdit} type="url" />
            </Field>
            <Toggle checked={v.published} onChange={(x) => canEdit && setV({ ...v, published: x })} label="Public business profile" />
            {save.error && <ErrorBox error={save.error} />}
            {save.isSuccess && <p className="text-sm text-lime">Saved.</p>}
            <Button type="submit" loading={save.isPending} disabled={!canEdit}>
              Save changes
            </Button>
          </form>
        </Glass>
        <Glass className="h-fit p-6">
          <p className="mb-4 font-display font-semibold">Team</p>
          <ul className="mb-5 space-y-2">
            {org.data.org.members.map((m) => (
              <li key={m.user.address} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm">
                <span className="font-mono text-xs">{shortAddr(m.user.address)}</span>
                <Badge tone={m.role === "OWNER" ? "lime" : "neutral"}>{m.role.toLowerCase()}</Badge>
              </li>
            ))}
          </ul>
          {canEdit && (
            <form
              className="space-y-3 border-t border-line pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                addMember.mutate();
              }}
            >
              <p className="text-xs text-mist">Invite a teammate by wallet address. They sign in with that wallet to get access.</p>
              <Input value={member.address} onChange={(e) => setMember({ ...member, address: e.target.value })} placeholder="0x…" className="font-mono" required />
              <Select value={member.role} onChange={(e) => setMember({ ...member, role: e.target.value })}>
                <option value="MEMBER">Member (view)</option>
                <option value="ADMIN">Admin (manage work)</option>
              </Select>
              {addMember.error && <ErrorBox error={addMember.error} />}
              <Button type="submit" variant="secondary" loading={addMember.isPending}>
                Add member
              </Button>
            </form>
          )}
        </Glass>
      </div>
    </div>
  );
}
