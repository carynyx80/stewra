"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  Boxes,
  CheckSquare,
  ChevronsUpDown,
  FolderKanban,
  Gauge,
  Landmark,
  Menu,
  Network,
  Plus,
  Receipt,
  Settings,
  ShoppingBag,
  Store,
  Wallet,
  X,
} from "lucide-react";
import { Logo, Mark } from "./Logo";
import { ConnectButton } from "./ConnectButton";
import { LiquidCanvas } from "./liquid/LiquidCanvas";
import { Button, Badge } from "./ui";
import { useAuth } from "@/lib/auth";
import { useMeta, useOrgs } from "@/lib/hooks";

const orgNav = [
  { seg: "", label: "Command center", icon: Gauge },
  { seg: "agents", label: "Workforce", icon: Bot },
  { seg: "structure", label: "Organization", icon: Network },
  { seg: "projects", label: "Projects & tasks", icon: FolderKanban },
  { seg: "approvals", label: "Approvals", icon: CheckSquare },
  { seg: "treasury", label: "Treasury", icon: Landmark },
  { seg: "payroll", label: "Payroll", icon: Wallet },
  { seg: "services", label: "Services", icon: Store },
  { seg: "orders", label: "Service orders", icon: Receipt },
  { seg: "analytics", label: "Analytics", icon: BarChart3 },
  { seg: "knowledge", label: "Knowledge base", icon: BookOpen },
  { seg: "activity", label: "Activity log", icon: Activity },
  { seg: "settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!ready) return <div className="min-h-dvh" />;
  if (!session) return <SignInGate />;

  return (
    <div className="relative flex min-h-dvh">
      <LiquidCanvas intensity={0.35} />
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-line bg-void/60 backdrop-blur-xl lg:block">
        <Sidebar onNavigate={() => undefined} />
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="absolute inset-y-0 left-0 w-72 border-r border-line bg-void"
            >
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-void/60 px-4 py-3 backdrop-blur-xl md:px-8">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <EnvBadges />
          <ConnectButton />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}

function EnvBadges() {
  const { data } = useMeta();
  if (!data) return <span />;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge tone={data.chain.chainId === 4663 ? "lime" : "info"}>{data.chain.name}</Badge>
      {!data.providerConfigured && !data.mockMode && <Badge tone="warn">Agent execution not configured</Badge>}
      {data.mockMode && <Badge tone="warn">Mock mode (local dev)</Badge>}
      {!data.escrowReady && <Badge tone="warn">Escrow not deployed</Badge>}
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const params = useParams<{ orgId?: string }>();
  const path = usePathname();
  const { data } = useOrgs();
  const [switcher, setSwitcher] = useState(false);
  const orgId = params.orgId;
  const current = data?.orgs.find((o) => o.id === orgId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-4">
        <Link href="/" onClick={onNavigate}>
          <Logo size={22} />
        </Link>
        <button className="lg:hidden" onClick={onNavigate} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative px-3">
        <button
          onClick={() => setSwitcher(!switcher)}
          className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-white/[0.03] px-3 py-2.5 text-left text-sm transition hover:bg-white/[0.06]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime/10 font-display text-xs font-semibold text-lime">
            {current ? current.name.slice(0, 2).toUpperCase() : <Boxes className="h-3.5 w-3.5" />}
          </span>
          <span className="min-w-0 flex-1 truncate">{current?.name ?? "All businesses"}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-dim" />
        </button>
        <AnimatePresence>
          {switcher && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              className="absolute inset-x-3 top-full z-20 mt-1.5 rounded-xl border border-line-strong bg-ink p-1.5 shadow-2xl"
            >
              <Link href="/app" onClick={() => { setSwitcher(false); onNavigate(); }} className="block rounded-lg px-3 py-2 text-sm text-mist hover:bg-white/5 hover:text-frost">
                All businesses
              </Link>
              {data?.orgs.map((o) => (
                <Link key={o.id} href={`/app/${o.id}`} onClick={() => { setSwitcher(false); onNavigate(); }} className="block truncate rounded-lg px-3 py-2 text-sm text-mist hover:bg-white/5 hover:text-frost">
                  {o.name}
                </Link>
              ))}
              <Link href="/app/new" onClick={() => { setSwitcher(false); onNavigate(); }} className="mt-1 flex items-center gap-2 rounded-lg border-t border-line px-3 py-2 text-sm text-lime hover:bg-white/5">
                <Plus className="h-3.5 w-3.5" /> New business
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="scrollbar-thin mt-4 flex-1 overflow-y-auto px-3 pb-4">
        {orgId ? (
          orgNav.map(({ seg, label, icon: Icon }) => {
            const href = `/app/${orgId}${seg ? `/${seg}` : ""}`;
            const active = seg ? path.startsWith(href) : path === href;
            return (
              <Link key={seg} href={href} onClick={onNavigate} className="relative mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-mist transition hover:text-frost">
                {active && <motion.span layoutId="side-pill" className="absolute inset-0 rounded-lg border border-line bg-white/[0.06]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <Icon className={`relative h-4 w-4 ${active ? "text-lime" : ""}`} />
                <span className="relative">{label}</span>
              </Link>
            );
          })
        ) : (
          <>
            <SideLink href="/app" label="Overview" icon={Gauge} active={path === "/app"} onNavigate={onNavigate} />
            <SideLink href="/app/new" label="Create business" icon={Plus} active={path === "/app/new"} onNavigate={onNavigate} />
            <SideLink href="/app/purchases" label="My purchases" icon={ShoppingBag} active={path.startsWith("/app/purchases")} onNavigate={onNavigate} />
            <SideLink href="/marketplace" label="Marketplace" icon={Store} active={false} onNavigate={onNavigate} />
          </>
        )}
      </nav>
      <div className="border-t border-line px-5 py-4 text-[11px] text-dim">
        <div className="flex items-center gap-2">
          <Mark size={14} /> Stewra · testnet
        </div>
      </div>
    </div>
  );
}

function SideLink({ href, label, icon: Icon, active, onNavigate }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean; onNavigate: () => void }) {
  return (
    <Link href={href} onClick={onNavigate} className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition ${active ? "border border-line bg-white/[0.06] text-frost" : "text-mist hover:text-frost"}`}>
      <Icon className={`h-4 w-4 ${active ? "text-lime" : ""}`} />
      {label}
    </Link>
  );
}

function SignInGate() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4">
      <LiquidCanvas intensity={0.9} />
      <div className="glass w-full max-w-md rounded-3xl p-8 text-center">
        <div className="mx-auto mb-5 flex justify-center">
          <Mark size={52} glow />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Sign in to Stewra</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-mist">
          Connect a wallet on Robinhood Chain and sign a one-time message. Signing is free and never moves funds.
        </p>
        <div className="mt-6 flex justify-center">
          <ConnectButton size="lg" />
        </div>
        <div className="mt-6">
          <Button variant="ghost" size="sm" href="/">
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}
