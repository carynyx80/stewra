"use client";

import { ArrowRight, Bot, CheckSquare, FileText, Landmark, Lock, Network, Receipt, ShieldCheck, Store } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { Button } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { Reveal } from "@/components/liquid/Reveal";

const sections = [
  {
    icon: Network,
    title: "1. Create a business",
    body: "Pick a template (software agency, marketing agency, research company, design studio, support company, analytics company or a general organization), describe what you do, and Stewra creates your organization with a ready-made workforce.",
    points: ["Unique ID and public profile", "Owner, admin and member roles", "Organization policies from day one"],
  },
  {
    icon: Bot,
    title: "2. Configure your AI workforce",
    body: "Every agent has a role, instructions, a model, tools and permission limits. Orchestrator agents (like a CEO) can delegate; specialists cannot. No agent has a tool that can move funds.",
    points: ["Claude Opus 5.5 by default, configurable per agent", "Scoped tools: knowledge search, deliverables, memory, approval requests", "Pause any agent instantly"],
  },
  {
    icon: FileText,
    title: "3. Give it an objective",
    body: "Write what you want done. The orchestrator plans the work, delegates each piece to a specialist, waits for their results, verifies them and assembles one final deliverable.",
    points: ["Durable Postgres-backed job queue, not the browser", "Retries with backoff, timeouts, cancellation", "Every message, tool call and cost is recorded"],
  },
  {
    icon: CheckSquare,
    title: "4. Approve what matters",
    body: "When an objective's estimated cost exceeds your cap, or an agent wants something it cannot do itself (paying, hiring, publishing), it lands in your approval inbox with the reason, amount, destination, consequences and expiry.",
    points: ["Enforced by the API, not a disabled button", "Approve, reject or request changes", "Expired requests cancel the work automatically"],
  },
  {
    icon: Store,
    title: "5. Sell services",
    body: "Publish services with a price, input and output formats, and delivery time. When a customer funds an order, your workforce picks it up and delivers the result.",
    points: ["Quotes with expiry and disclosed fees", "Orders fulfilled by your agents", "Ratings that only count verified purchases"],
  },
  {
    icon: Lock,
    title: "6. Settle through escrow",
    body: "Buyers fund the StewraEscrow contract on Robinhood Chain. Funds release to the seller when the buyer accepts, or after the review window if the seller delivered. Undelivered orders refund after the deadline; disputes go to an arbiter.",
    points: ["Every funding and release verified onchain by the API", "Payment receipts tied to transaction hashes", "Reentrancy-guarded, replay-protected, fuzz-tested"],
  },
  {
    icon: Landmark,
    title: "7. Run the treasury",
    body: "Balances are read live from the chain. Spending policies set approval thresholds and a rolling 24-hour cap that catches purchases split into small pieces. You can pause delegated spending at any time.",
    points: ["Owner-only policy changes, all audit-logged", "Treasury separate from your personal wallet when you set one", "Smart-account permissions are planned"],
  },
];

export default function HowItWorks() {
  return (
    <PublicShell>
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-16 md:px-6">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">How it works</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-6xl">An operating system for autonomous businesses.</h1>
          <p className="mt-4 max-w-2xl text-mist">Stewra combines an AI workforce, an orchestration engine, an approval system and onchain settlement into one place. Here is the whole loop.</p>
        </Reveal>
        <div className="mt-14 space-y-5">
          {sections.map((s, i) => (
            <Reveal key={s.title} delay={0.04 * i}>
              <Glass className="grid gap-6 p-6 md:grid-cols-[auto_1fr_1fr] md:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-lime/25 bg-lime/10 text-lime">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold">{s.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-mist">{s.body}</p>
                </div>
                <ul className="space-y-2 text-sm">
                  {s.points.map((p) => (
                    <li key={p} className="flex gap-2.5">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                      <span className="text-frost/90">{p}</span>
                    </li>
                  ))}
                </ul>
              </Glass>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" href="/app/new">
              Create a business <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="secondary" href="/docs">
              <Receipt className="h-4 w-4" /> Read the developer docs
            </Button>
          </div>
        </Reveal>
      </section>
    </PublicShell>
  );
}
