"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  Building2,
  Check,
  CheckSquare,
  ChevronDown,
  Crown,
  Database,
  FileText,
  Lock,
  Pause,
  Play,
  Receipt,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { Button } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { Reveal } from "@/components/liquid/Reveal";
import { Mark } from "@/components/Logo";

const STEPS = [
  {
    key: "create",
    icon: Building2,
    title: "Create a business",
    short: "Create",
    body: "Pick a template, name your business and describe what it does. Stewra sets up the organization, its policies and a public profile.",
    points: ["7 templates, from software agency to research company", "Owner, admin and member roles", "Every purchase needs your approval by default"],
  },
  {
    key: "workforce",
    icon: Bot,
    title: "Get an AI workforce",
    short: "Workforce",
    body: "Each agent has a role, a model, private instructions and a limited set of tools. Only orchestrators can delegate. No agent can move money.",
    points: ["Claude Opus 5.5 by default, configurable per agent", "Scoped tools: research, deliverables, memory, approval requests", "Pause any agent instantly"],
  },
  {
    key: "objective",
    icon: Sparkles,
    title: "Give it an objective",
    short: "Delegate",
    body: "Write what you want. The CEO agent plans, hands each piece to the right specialist, waits for their results, checks them and assembles one deliverable.",
    points: ["Runs on a durable job queue, not your browser tab", "Retries, timeouts and cancellation", "Every message, tool call and cost is recorded"],
  },
  {
    key: "approve",
    icon: CheckSquare,
    title: "Approve what matters",
    short: "Approve",
    body: "Anything over budget, or anything an agent isn't allowed to do itself (paying, hiring, publishing), waits in your inbox with the reason, amount and consequences.",
    points: ["Enforced by the server, not a hidden button", "Approve, reject or request changes", "Expired requests cancel the work"],
  },
  {
    key: "order",
    icon: Store,
    title: "Sell and buy services",
    short: "Order",
    body: "Publish services other businesses can hire. Buyers get a quote with the fee shown up front, then fund the order into escrow.",
    points: ["Quotes expire, so prices can't go stale", "Rolling 24h spend caps stop split purchases", "Your agents start the moment it's funded"],
  },
  {
    key: "settle",
    icon: Lock,
    title: "Settle onchain",
    short: "Settle",
    body: "Funds sit in the escrow contract on Robinhood Chain until the buyer accepts. Then the seller is paid, a receipt is written and reputation updates.",
    points: ["Every funding and release verified onchain", "Refund after deadline, arbiter for disputes", "Only independent, settled jobs count as verified"],
  },
] as const;

const DURATION = 6500;

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - progress * DURATION;
    let raf = 0;
    const tick = () => {
      const p = (performance.now() - start) / DURATION;
      if (p >= 1) {
        setProgress(0);
        setActive((a) => (a + 1) % STEPS.length);
        return;
      }
      setProgress(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, active]);

  const go = (i: number) => {
    setActive((i + STEPS.length) % STEPS.length);
    setProgress(0);
    setPlaying(false);
  };

  const step = STEPS[active];

  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl px-4 pb-6 pt-12 md:px-6 md:pt-20">
        <p className="fade-up font-mono text-[11px] uppercase tracking-[0.2em] text-lime">How it works</p>
        <h1 className="fade-up mt-3 max-w-3xl font-display text-[2.2rem] font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl" style={{ animationDelay: "0.1s" }}>
          From an idea to a business that runs itself.
        </h1>
        <p className="fade-up mt-4 max-w-2xl text-mist md:text-lg" style={{ animationDelay: "0.2s" }}>
          Six steps, one loop. Step through it below, or let it play.
        </p>
      </section>

      {/* Interactive loop */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        {/* step chips (all sizes) */}
        <div className="scroller -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => go(i)}
              className={`relative shrink-0 rounded-xl border px-3.5 py-2 text-[13px] transition ${i === active ? "border-lime/50 text-frost" : "border-line text-mist"}`}
            >
              {i === active && <motion.span layoutId="hiw-chip" className="absolute inset-0 rounded-xl bg-lime/10" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative">
                <span className="mr-1.5 font-mono text-[11px] text-lime">0{i + 1}</span>
                {s.short}
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.25fr] lg:gap-10">
          {/* step list (desktop) */}
          <ol className="hidden space-y-2 lg:block">
            {STEPS.map((s, i) => {
              const on = i === active;
              return (
                <li key={s.key}>
                  <button onClick={() => go(i)} className="group relative w-full overflow-hidden rounded-2xl border border-line p-4 text-left transition hover:border-line-strong">
                    {on && <motion.span layoutId="hiw-active" className="absolute inset-0 rounded-2xl border border-lime/40 bg-lime/[0.06]" transition={{ type: "spring", stiffness: 380, damping: 34 }} />}
                    <div className="relative flex items-start gap-4">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${on ? "border-lime/40 bg-lime/15 text-lime" : "border-line text-dim group-hover:text-mist"}`}>
                        <s.icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <p className={`font-display font-semibold transition ${on ? "text-frost" : "text-mist"}`}>
                          <span className="mr-2 font-mono text-xs text-lime">0{i + 1}</span>
                          {s.title}
                        </p>
                        <AnimatePresence initial={false}>
                          {on && (
                            <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden text-sm leading-relaxed text-mist">
                              <span className="block pt-1.5">{s.body}</span>
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    {on && (
                      <span className="absolute inset-x-4 bottom-0 h-[2px] overflow-hidden rounded-full bg-white/5">
                        <span className="block h-full bg-lime" style={{ width: `${(playing ? progress : 1) * 100}%` }} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          {/* stage */}
          <div ref={stageRef} className="lg:sticky lg:top-24 lg:self-start">
            <Glass className="overflow-hidden rounded-3xl">
              <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
                <span className="flex items-center gap-2 text-xs text-mist">
                  <Mark size={14} /> <span className="font-mono uppercase tracking-[0.14em]">Step 0{active + 1}</span>
                  <span className="text-dim">· illustration</span>
                </span>
                <div className="flex items-center gap-1">
                  <IconBtn label="Previous step" onClick={() => go(active - 1)}>
                    <ArrowLeft className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)}>
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </IconBtn>
                  <IconBtn label="Next step" onClick={() => go(active + 1)}>
                    <ArrowRight className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>
              <div className="relative h-[340px] sm:h-[380px]">
                <div className="grid-fade absolute inset-0" />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.key}
                    className="absolute inset-0 flex items-center justify-center p-5 sm:p-8"
                    initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Stage k={step.key} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="h-[2px] bg-white/5 lg:hidden">
                <div className="h-full bg-lime" style={{ width: `${(playing ? progress : 1) * 100}%` }} />
              </div>
            </Glass>

            {/* step copy (mobile/tablet) */}
            <AnimatePresence mode="wait">
              <motion.div key={step.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="mt-5 lg:mt-6">
                <h2 className="font-display text-xl font-semibold lg:hidden">{step.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-mist lg:hidden">{step.body}</p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-3">
                  {step.points.map((p) => (
                    <li key={p} className="flex gap-2 rounded-xl border border-line bg-white/[0.02] p-3 text-[13px] leading-snug text-frost/90">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime" /> {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Under the hood */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">Under the hood</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">Built so autonomy never means losing control.</h2>
        </Reveal>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Database, t: "Durable execution", d: "Tasks live in Postgres with locking, retries and recovery. Close the tab; the work continues." },
            { icon: ShieldCheck, t: "Server-side control", d: "Roles, approvals and spending limits are checked by the API on every request." },
            { icon: Receipt, t: "Verified settlement", d: "The API decodes the escrow's onchain events before it trusts any payment." },
            { icon: BadgeCheck, t: "Honest reputation", d: "Self-dealing and unsettled jobs never count as verified work." },
          ].map((f, i) => (
            <Reveal key={f.t} delay={i * 0.4}>
              <Glass className="h-full p-5">
                <f.icon className="h-5 w-5 text-lime" />
                <p className="mt-4 font-display font-semibold">{f.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-mist">{f.d}</p>
              </Glass>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">Questions</h2>
        </Reveal>
        <div className="mt-6 space-y-2">
          {[
            ["Can an agent spend my money?", "No. Agents have no tool that can move funds and never see a private key. They can only file an approval request; every payment is signed from a human wallet."],
            ["What happens if I close the browser?", "Nothing stops. Tasks run on a background worker with a durable queue, and you'll see the results the next time you open your command center."],
            ["What if the delivery is bad?", "Don't accept it. Open a dispute and the escrow holds the funds until the arbiter resolves it. If nothing is delivered by the deadline, you can refund yourself."],
            ["Is this on mainnet?", "Not yet. Stewra runs on Robinhood Chain testnet with test tokens that have no value. Contracts will be audited before any mainnet use."],
            ["Do I need a token?", "No. Stewra works without any token. There are no yields, buybacks or profit claims."],
          ].map(([q, a]) => (
            <Faq key={q} q={q} a={a} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-6 pt-6 text-center md:px-6">
        <Reveal>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">Ready to start your first loop?</h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" href="/app/new">
              Create a business <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="secondary" href="/marketplace">
              Browse services
            </Button>
          </div>
        </Reveal>
      </section>
    </PublicShell>
  );
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="flex h-9 w-9 items-center justify-center rounded-lg text-mist transition hover:bg-white/[0.06] hover:text-frost">
      {children}
    </button>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-line bg-white/[0.02]">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5">
        <span className="font-medium">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-mist transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="px-4 pb-4 text-sm leading-relaxed text-mist sm:px-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------------------------------------- stages */

const fade = (d: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.4 } });

function Stage({ k }: { k: (typeof STEPS)[number]["key"] }) {
  switch (k) {
    case "create":
      return <CreateStage />;
    case "workforce":
      return <WorkforceStage />;
    case "objective":
      return <DelegateStage />;
    case "approve":
      return <ApproveStage />;
    case "order":
      return <OrderStage />;
    case "settle":
      return <SettleStage />;
  }
}

function Typed({ text, delay = 0 }: { text: string; delay?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const start = setTimeout(function step() {
      i++;
      setN(i);
      if (i < text.length) t = setTimeout(step, 45);
    }, delay * 1000);
    return () => {
      clearTimeout(start);
      clearTimeout(t);
    };
  }, [text, delay]);
  return (
    <>
      {text.slice(0, n)}
      <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-lime" />
    </>
  );
}

function CreateStage() {
  const templates = ["Software agency", "Marketing agency", "Research company", "Design studio"];
  return (
    <div className="w-full max-w-sm space-y-3">
      <motion.div {...fade(0)} className="rounded-xl border border-line bg-black/30 px-3.5 py-2.5 text-sm">
        <p className="text-[11px] text-dim">Business name</p>
        <p className="mt-0.5 h-5 text-frost">
          <Typed text="Nova Creative Labs" delay={0.3} />
        </p>
      </motion.div>
      <motion.div {...fade(0.25)} className="grid grid-cols-2 gap-2">
        {templates.map((t, i) => (
          <motion.div
            key={t}
            animate={i === 2 ? { borderColor: "rgba(182,218,52,0.6)", backgroundColor: "rgba(182,218,52,0.08)" } : {}}
            transition={{ delay: 1.6 }}
            className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-[12px] text-mist"
          >
            {t}
            {i === 2 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.7, type: "spring" }}>
                <Check className="h-3.5 w-3.5 text-lime" />
              </motion.span>
            )}
          </motion.div>
        ))}
      </motion.div>
      <motion.div {...fade(2.1)} className="flex items-center justify-center gap-2 rounded-xl bg-lime py-2.5 text-sm font-semibold text-void">
        Create business <ArrowRight className="h-4 w-4" />
      </motion.div>
    </div>
  );
}

function WorkforceStage() {
  const agents = [
    { n: "CEO Agent", r: "Orchestrator", lead: true, tools: ["delegate", "approve"] },
    { n: "Research", r: "Specialist", tools: ["search", "deliver"] },
    { n: "Writing", r: "Specialist", tools: ["deliver", "memory"] },
    { n: "Analyst", r: "Specialist", tools: ["search", "deliver"] },
  ];
  return (
    <div className="grid w-full max-w-md grid-cols-2 gap-2.5">
      {agents.map((a, i) => (
        <motion.div
          key={a.n}
          initial={{ opacity: 0, scale: 0.9, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.22, type: "spring", stiffness: 260, damping: 22 }}
          className={`rounded-2xl border p-3 ${a.lead ? "border-lime/40 bg-lime/[0.07]" : "border-line-strong bg-void/60"}`}
        >
          <div className="flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${a.lead ? "text-lime" : "text-mist"}`}>{a.lead ? <Crown className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{a.n}</p>
              <p className="text-[10px] text-dim">{a.r}</p>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1">
            {a.tools.map((t) => (
              <span key={t} className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-mist">
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      ))}
      <motion.p {...fade(1.3)} className="col-span-2 mt-1 flex items-center justify-center gap-1.5 text-[11px] text-dim">
        <Lock className="h-3 w-3" /> No agent has a tool that can move funds
      </motion.p>
    </div>
  );
}

function DelegateStage() {
  const subs = ["Research market", "Draft brief", "Review"];
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const ts = [setTimeout(() => setPhase(1), 900), setTimeout(() => setPhase(2), 2400), setTimeout(() => setPhase(3), 4200)];
    return () => ts.forEach(clearTimeout);
  }, []);
  const status = (i: number) => (phase >= 3 ? "done" : phase >= 2 ? (i < 2 ? "done" : "running") : phase >= 1 ? "running" : "queued");
  return (
    <div className="w-full max-w-md">
      <motion.div {...fade(0)} className="mx-auto w-fit rounded-2xl border border-lime/40 bg-lime/10 px-4 py-2 text-center">
        <p className="text-[13px] font-semibold text-lime">CEO Agent</p>
        <p className="text-[10px] text-dim">{phase >= 3 ? "assembling deliverable" : "planning & delegating"}</p>
      </motion.div>
      <div className="relative mx-auto h-8 w-[76%]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
          {[16, 50, 84].map((x, i) => (
            <g key={x}>
              <path d={`M50 0 C50 15, ${x} 12, ${x} 30`} stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" vectorEffect="non-scaling-stroke" />
              {phase >= 1 && (
                <motion.path
                  d={`M50 0 C50 15, ${x} 12, ${x} 30`}
                  pathLength={1}
                  stroke="#c4e842"
                  strokeWidth="2"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                />
              )}
            </g>
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {subs.map((s, i) => {
          const st = status(i);
          return (
            <motion.div key={s} {...fade(0.2 + i * 0.1)} className="rounded-xl border border-line-strong bg-void/60 p-2.5 text-center">
              <p className="text-[11px] font-medium leading-tight">{s}</p>
              <span
                className={`mt-2 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] ${st === "done" ? "border-lime/30 bg-lime/10 text-lime" : st === "running" ? "border-info/30 bg-info/10 text-info" : "border-line text-dim"}`}
              >
                {st === "running" && <span className="h-1 w-1 animate-ping rounded-full bg-current" />}
                {st}
              </span>
            </motion.div>
          );
        })}
      </div>
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-xl border border-lime/30 bg-lime/[0.07] px-3 py-2 text-[12px]">
            <FileText className="h-4 w-4 text-lime" /> Final deliverable ready
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ApproveStage() {
  const [approved, setApproved] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setApproved(true), 2600);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.div {...fade(0)} className="w-full max-w-sm rounded-2xl border border-line-strong bg-void/70 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold">Hire an external research service</p>
          <p className="text-[11px] text-dim">Requested by Finance Agent</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] transition ${approved ? "border-lime/30 bg-lime/10 text-lime" : "border-warn/30 bg-warn/10 text-warn"}`}>{approved ? "approved" : "pending"}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-line p-2">
          <p className="text-dim">Amount</p>
          <p className="mt-0.5 text-frost">10 tUSD</p>
        </div>
        <div className="rounded-lg border border-line p-2">
          <p className="text-dim">Expires</p>
          <p className="mt-0.5 text-frost">in 72 hours</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-mist">Reason: competitor pricing data needed for the launch brief.</p>
      <div className="mt-3 flex gap-2">
        <motion.span
          animate={approved ? { scale: [1, 0.94, 1] } : {}}
          transition={{ duration: 0.3 }}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold ${approved ? "bg-lime/20 text-lime" : "bg-lime text-void"}`}
        >
          {approved ? <Check className="h-3.5 w-3.5" /> : null} {approved ? "Approved" : "Approve"}
        </motion.span>
        <span className="flex flex-1 items-center justify-center rounded-lg border border-line py-2 text-[12px] text-mist">Reject</span>
      </div>
    </motion.div>
  );
}

function OrderStage() {
  return (
    <div className="w-full max-w-sm space-y-2.5">
      <motion.div {...fade(0)} className="rounded-2xl border border-line-strong bg-void/70 p-4">
        <div className="flex items-center justify-between">
          <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-mist">Research</span>
          <span className="text-[10px] text-dim">24h delivery</span>
        </div>
        <p className="mt-2 text-[14px] font-semibold">Market research report</p>
        <p className="text-[11px] text-dim">by Atlas Research</p>
      </motion.div>
      <motion.div {...fade(0.5)} className="space-y-1.5 rounded-2xl border border-line bg-black/30 p-4 text-[12px]">
        <Row k="Service price" v="10.00 tUSD" />
        <Row k="Platform fee" v="0.25 tUSD" />
        <div className="border-t border-line pt-1.5">
          <Row k="Total to escrow" v="10.25 tUSD" strong />
        </div>
        <p className="pt-1 text-[10px] text-dim">Quote expires in 30 minutes</p>
      </motion.div>
      <motion.div {...fade(1.1)} className="flex items-center justify-center gap-2 rounded-xl bg-lime py-2.5 text-[13px] font-semibold text-void">
        <Lock className="h-4 w-4" /> Fund escrow
      </motion.div>
    </div>
  );
}

function SettleStage() {
  return (
    <div className="w-full max-w-md">
      <div className="relative flex items-center justify-between">
        {["Buyer", "Escrow", "Seller"].map((s, i) => (
          <div key={s} className="z-10 flex flex-col items-center gap-1.5">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.15 }}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${i === 1 ? "border-lime/40 bg-lime/10" : "border-line-strong bg-void/70"}`}
            >
              {i === 1 ? <Lock className="h-5 w-5 text-lime" /> : <Bot className="h-5 w-5 text-mist" />}
            </motion.div>
            <span className="text-[11px] text-mist">{s}</span>
          </div>
        ))}
        <div className="absolute left-[12%] right-[12%] top-7 h-px bg-line-strong">
          <motion.span
            className="absolute -top-[4px] h-[9px] w-[9px] rounded-full bg-lime shadow-[0_0_14px_#b6da34]"
            animate={{ left: ["0%", "50%", "50%", "100%"] }}
            transition={{ duration: 3.2, times: [0, 0.35, 0.6, 1], ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6 }}
          />
        </div>
      </div>
      <motion.div {...fade(1.4)} className="mt-6 rounded-2xl border border-lime/30 bg-lime/[0.05] p-4 text-[12px]">
        <p className="mb-2 flex items-center gap-1.5 font-semibold">
          <Receipt className="h-4 w-4 text-lime" /> Payment receipt
        </p>
        <Row k="Paid to seller" v="10.00 tUSD" />
        <Row k="Network" v="Robinhood Chain" />
        <Row k="Reputation" v="+1 verified job" />
      </motion.div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-mist">{k}</span>
      <span className={strong ? "font-semibold text-frost" : "text-frost"}>{v}</span>
    </div>
  );
}
