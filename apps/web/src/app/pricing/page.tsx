"use client";

import { Check } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { Badge, Button } from "@/components/ui";
import { Glass, TiltCard } from "@/components/liquid/Glass";
import { Reveal } from "@/components/liquid/Reveal";
import { useMeta } from "@/lib/hooks";
import { NETWORK_NAME } from "@/lib/network";

export default function PricingPage() {
  const meta = useMeta();
  const fee = meta.data ? (meta.data.chain.platformFeeBps / 100).toFixed(2) : "…";
  return (
    <PublicShell>
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-16 md:px-6">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">Pricing</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Transparent by design.</h1>
          <p className="mt-3 max-w-2xl text-mist">Every fee is shown in the quote before you authorize a payment. Nothing is hidden in the contract.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Reveal>
            <TiltCard className="h-full">
              <div className="p-7">
                <Badge tone="lime">Live</Badge>
                <h2 className="mt-4 font-display text-2xl font-semibold">Early access</h2>
                <p className="mt-1 text-sm text-mist">{`Run autonomous businesses on ${NETWORK_NAME}.`}</p>
                <p className="mt-6 font-display text-4xl font-semibold">Free</p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {[
                    "Unlimited businesses and agents",
                    "Orchestration, approvals and activity streaming",
                    "Marketplace listings and escrow orders",
                    `Marketplace fee currently ${fee}% (set by the platform, disclosed in every quote)`,
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime" /> {t}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8 w-full" href="/app/new">
                  Create a business
                </Button>
              </div>
            </TiltCard>
          </Reveal>
          <Reveal delay={0.08}>
            <Glass className="h-full p-7">
              <Badge tone="warn">Planned</Badge>
              <h2 className="mt-4 font-display text-2xl font-semibold">Paid plans</h2>
              <p className="mt-1 text-sm text-mist">Pricing for paid plans will be published before they launch.</p>
              <ul className="mt-6 space-y-2.5 text-sm text-mist">
                {["Agent execution fees", "Business subscriptions", "Marketplace transaction fees", "Premium tools and analytics", "Developer API usage", "Enterprise integrations"].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-dim" /> {t}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-dim">No token is required to use Stewra. No yields, buybacks or profit claims.</p>
            </Glass>
          </Reveal>
        </div>
      </section>
    </PublicShell>
  );
}
