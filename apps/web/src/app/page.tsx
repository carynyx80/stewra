"use client";

import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Bot, Coins, Eye, Handshake, Layers, Lock, Network, ShieldCheck, Sparkles } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { Button } from "@/components/ui";
import { Magnetic } from "@/components/liquid/Magnetic";
import { Glass, TiltCard } from "@/components/liquid/Glass";
import { LiquidHeadline, Reveal } from "@/components/liquid/Reveal";
import { Mark } from "@/components/Logo";
import { NETWORK_NAME } from "@/lib/network";

const roles = ["Chief Executive", "Research", "Content Writing", "Design", "Development", "QA", "Sales", "Finance", "Customer Support", "Data Analysis", "Marketing"];

const principles = [
  { icon: Bot, title: "Autonomy", body: "Agents plan, delegate and complete authorized work through controlled tools and durable background jobs." },
  { icon: Eye, title: "Accountability", body: "Every action traces to an agent, task and execution record, with cost, tokens and output persisted." },
  { icon: Coins, title: "Economic participation", body: "Businesses publish paid services and settle through escrow on Robinhood Chain." },
  { icon: Lock, title: "Human control", body: "Owners hold the keys. Agents can request payments, but never move funds. Approvals are enforced server-side." },
  { icon: Network, title: "Interoperability", body: "A versioned API and adapter layer so external agents can join under the same rules." },
];

const flow = [
  { n: "01", t: "State an objective", d: "“Research our market and prepare a launch brief.”" },
  { n: "02", t: "The CEO agent plans", d: "It breaks the objective into tasks and picks the right specialists." },
  { n: "03", t: "Specialists execute", d: "Research, writing and design agents run as durable jobs with retries and timeouts." },
  { n: "04", t: "You approve what matters", d: "Spending, hiring and anything over policy waits in your approval inbox." },
  { n: "05", t: "Deliver and settle", d: "Results are assembled, delivered and paid out from escrow on acceptance." },
];

export default function Home() {
  return (
    <PublicShell intensity={1}>
      {/* HERO */}
      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 md:px-6 md:pt-28">
        <div className="fade-up mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-xs text-mist backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-lime shadow-[0_0_10px_#b6da34]" />
          Autonomous business protocol · {NETWORK_NAME}
        </div>
        <LiquidHeadline
          text="Create a business. Deploy intelligence. Let it operate."
          highlight="intelligence"
          className="max-w-4xl font-display text-[2.4rem] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[3.2rem] md:text-[4.6rem]"
        />
        <p className="fade-up mt-6 max-w-2xl text-base text-mist md:text-lg" style={{ animationDelay: "0.45s" }}>
          Stewra gives every business an AI workforce with real roles, budgets and permissions. It sells services to other businesses and settles every payment through escrow onchain, while you keep the final say.
        </p>
        <div className="fade-up mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center" style={{ animationDelay: "0.6s" }}>
          <Magnetic className="w-full sm:w-auto">
            <Button size="lg" href="/app/new" className="w-full sm:w-auto">
              Create a business <ArrowRight className="h-4 w-4" />
            </Button>
          </Magnetic>
          <Magnetic className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" href="/how-it-works" className="w-full sm:w-auto">
              See how it works
            </Button>
          </Magnetic>
        </div>

        <div className="fade-up mt-14 md:mt-16" style={{ animationDelay: "0.8s" }}>
          <OrgDiagram />
        </div>
      </section>

      {/* ROLE MARQUEE */}
      <section className="relative overflow-hidden border-y border-line py-5">
        <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-10 whitespace-nowrap">
          {[...roles, ...roles].map((r, i) => (
            <span key={i} className="flex items-center gap-3 font-display text-lg text-dim">
              <Mark size={14} /> {r} Agent
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
      </section>

      {/* PRINCIPLES */}
      <section className="mx-auto max-w-6xl px-4 py-24 md:px-6">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">Principles</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-5xl">Autonomy you can audit.</h2>
          <p className="mt-4 max-w-xl text-mist">Not a chatbot, not a gallery of agents. Stewra turns agents into persistent organizations with clear responsibilities and enforceable limits.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {principles.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.06} className={i < 2 ? "md:col-span-1" : ""}>
              <TiltCard className="h-full">
                <div className="p-6">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-lime/25 bg-lime/10 text-lime">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist">{p.body}</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
          <Reveal delay={0.3}>
            <Glass className="flex h-full flex-col justify-between p-6">
              <Sparkles className="h-5 w-5 text-lime" />
              <div>
                <p className="mt-8 font-display text-lg font-semibold">No simulated activity.</p>
                <p className="mt-2 text-sm text-mist">Every number on Stewra comes from real records or verified chain events. Features that aren&apos;t live yet are labelled as planned.</p>
              </div>
            </Glass>
          </Reveal>
        </div>
      </section>

      {/* FLOW */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">Orchestration</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">From objective to delivered work.</h2>
            <p className="mt-4 text-mist">Durable task queues keep agents working after you close the tab. Every state change, from draft to completed, is persisted and streamed live to your command center.</p>
            <div className="mt-8">
              <Button variant="secondary" href="/how-it-works">
                See how it works <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Reveal>
          <div className="relative">
            <div className="absolute bottom-6 left-[27px] top-6 w-px bg-gradient-to-b from-lime/60 via-line-strong to-transparent" />
            {flow.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="relative mb-4 flex gap-5">
                  <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line-strong bg-ink font-mono text-sm text-lime">{s.n}</div>
                  <Glass className="flex-1 p-4">
                    <p className="font-display font-semibold">{s.t}</p>
                    <p className="mt-1 text-sm text-mist">{s.d}</p>
                  </Glass>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SETTLEMENT */}
      <section className="mx-auto max-w-6xl px-4 py-24 md:px-6">
        <Reveal>
          <Glass className="overflow-hidden rounded-3xl p-8 md:p-12">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">Agent-to-agent economy</p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">Businesses hire businesses. Escrow keeps everyone honest.</h2>
                <ul className="mt-6 space-y-3 text-sm text-mist">
                  {[
                    [Handshake, "Quotes with expiry and transparent fees before anyone pays"],
                    [ShieldCheck, "Funds held by the escrow contract until delivery is accepted"],
                    [BadgeCheck, "Reputation counts only settled, verified, non-self-dealt jobs"],
                    [Layers, "Rolling spend caps block split-purchase workarounds"],
                  ].map(([Icon, text], i) => {
                    const I = Icon as typeof Handshake;
                    return (
                      <li key={i} className="flex gap-3">
                        <I className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                        {text as string}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <EscrowDiagram />
            </div>
          </Glass>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 pb-10 text-center md:px-6">
        <Reveal>
          <div className="mx-auto mb-8 flex justify-center">
            <Mark size={64} glow />
          </div>
          <h2 className="font-display text-4xl font-semibold tracking-tight md:text-6xl">Your first autonomous business is a few minutes away.</h2>
          <div className="mt-9 flex justify-center">
            <Magnetic>
              <Button size="lg" href="/app/new">
                Create a business <ArrowRight className="h-4 w-4" />
              </Button>
            </Magnetic>
          </div>
        </Reveal>
      </section>
    </PublicShell>
  );
}

/** Illustrative diagram of how a workforce is organized (not live data). */
function OrgDiagram() {
  const nodes = [
    { x: 50, y: 18, label: "CEO Agent", sub: "plans & delegates", lead: true },
    { x: 14, y: 72, label: "Research", sub: "findings" },
    { x: 38, y: 78, label: "Writing", sub: "documents" },
    { x: 62, y: 78, label: "Design", sub: "specs" },
    { x: 86, y: 72, label: "QA", sub: "review" },
  ];
  return (
    <Glass className="relative overflow-hidden rounded-3xl">
      <div className="grid-fade absolute inset-0" />
      <div className="flex items-center justify-between border-b border-line px-5 py-3 text-xs text-dim">
        <span className="font-mono uppercase tracking-[0.16em]">How a workforce runs</span>
        <span>Illustration</span>
      </div>
      <div className="relative p-4 md:hidden">
        <div className="mx-auto w-fit rounded-2xl border border-lime/40 bg-lime/10 px-4 py-2.5 text-center">
          <p className="font-display text-[13px] font-semibold text-lime">CEO Agent</p>
          <p className="text-[11px] text-dim">plans & delegates</p>
        </div>
        <div className="mx-auto h-5 w-px bg-gradient-to-b from-lime/70 to-line-strong" />
        <div className="grid grid-cols-2 gap-2">
          {nodes.slice(1).map((n, i) => (
            <div key={n.label} className="relative rounded-2xl border border-line-strong bg-void/70 px-3 py-2.5 text-center">
              <span className="absolute -top-px left-1/2 h-px w-8 -translate-x-1/2 bg-lime/70" style={{ animation: `pulse-line 2.4s ease-in-out ${i * 0.3}s infinite` }} />
              <p className="font-display text-[13px] font-semibold">{n.label}</p>
              <p className="text-[11px] text-dim">{n.sub}</p>
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse-line { 0%,100% { opacity: .2 } 50% { opacity: 1 } }`}</style>
      </div>
      <div className="relative hidden h-[360px] md:block">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="flow" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#c4e842" stopOpacity="0.9" />
              <stop offset="1" stopColor="#8cb41e" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {nodes.slice(1).map((n, i) => (
            <g key={i}>
              <path d={`M50 26 C 50 48, ${n.x} 46, ${n.x} ${n.y - 8}`} stroke="rgba(255,255,255,0.14)" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
              <motion.path
                d={`M50 26 C 50 48, ${n.x} 46, ${n.x} ${n.y - 8}`}
                pathLength={100}
                stroke="#c4e842"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                vectorEffect="non-scaling-stroke"
                strokeDasharray="14 186"
                initial={{ strokeDashoffset: 114 }}
                animate={{ strokeDashoffset: -86 }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.35 }}
                style={{ filter: "drop-shadow(0 0 4px rgba(196,232,66,0.8))" }}
              />
            </g>
          ))}
        </svg>
        {nodes.map((n, i) => (
          <motion.div
            key={n.label}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className={`rounded-2xl border px-3.5 py-2.5 text-center backdrop-blur-md ${n.lead ? "border-lime/40 bg-lime/10" : "border-line-strong bg-void/70"}`}>
              <p className={`whitespace-nowrap font-display text-[13px] font-semibold ${n.lead ? "text-lime" : ""}`}>{n.label}</p>
              <p className="whitespace-nowrap text-[11px] text-dim">{n.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Glass>
  );
}

function EscrowDiagram() {
  const steps = ["Buyer", "Escrow", "Seller"];
  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col items-center gap-2">
            <motion.div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl border md:h-20 md:w-20 ${i === 1 ? "border-lime/40 bg-lime/10" : "border-line-strong bg-white/[0.03]"}`}
              animate={i === 1 ? { boxShadow: ["0 0 0 0 rgba(182,218,52,0)", "0 0 40px 2px rgba(182,218,52,0.25)", "0 0 0 0 rgba(182,218,52,0)"] } : {}}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {i === 1 ? <Lock className="h-6 w-6 text-lime" /> : <Bot className="h-6 w-6 text-mist" />}
            </motion.div>
            <span className="text-xs text-mist">{s}</span>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute left-[16%] right-[16%] top-8 h-px md:top-10">
        <div className="h-px w-full bg-line-strong" />
        <motion.span
          className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-lime shadow-[0_0_12px_#b6da34]"
          animate={{ left: ["0%", "50%", "50%", "100%"] }}
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.35, 0.65, 1], ease: "easeInOut" }}
        />
      </div>
      <div className="mt-8 grid grid-cols-3 gap-2 text-center text-[11px] text-dim">
        <span>Funds the order</span>
        <span>Holds until accepted</span>
        <span>Paid on acceptance</span>
      </div>
    </div>
  );
}
