"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { ConnectButton } from "./ConnectButton";
import { LiquidCanvas } from "./liquid/LiquidCanvas";
import { Button } from "./ui";
import { XLink } from "./Social";
import { useAuth } from "@/lib/auth";
import { IS_MAINNET, NETWORK_NAME } from "@/lib/network";

const links = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/businesses", label: "Businesses" },
  { href: "/docs", label: "Developers" },
  { href: "/pricing", label: "Pricing" },
];

export function PublicShell({ children, intensity = 0.75 }: { children: React.ReactNode; intensity?: number }) {
  const path = usePathname();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative min-h-dvh">
      <LiquidCanvas intensity={intensity} />
      <header className="sticky top-0 z-40">
        <div className="mx-3 mt-3 flex max-w-6xl items-center justify-between gap-4 rounded-2xl border border-line bg-void/70 px-4 py-2.5 backdrop-blur-xl sm:mx-4 md:mx-auto md:px-5">
          <Link href="/" aria-label="Stewra home">
            <Logo size={24} />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = path.startsWith(l.href);
              return (
                <Link key={l.href} href={l.href} className="relative rounded-lg px-3 py-1.5 text-[13px] text-mist transition hover:text-frost">
                  {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-lg bg-white/[0.06]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                  <span className="relative">{l.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <XLink />
            {session && (
              <Button size="sm" variant="secondary" href="/app">
                Open app
              </Button>
            )}
            <ConnectButton />
          </div>
          <button className="-mr-2 flex h-10 w-10 items-center justify-center rounded-xl md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-4 mt-2 rounded-2xl border border-line bg-void/90 p-3 backdrop-blur-xl md:hidden"
            >
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-[15px] text-mist hover:bg-white/5 hover:text-frost">
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <Button size="sm" variant="secondary" href="/app">
                  Open app
                </Button>
                <ConnectButton />
                <XLink className="ml-auto" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <main>{children}</main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4 md:gap-10 md:px-6">
        <div className="col-span-2">
          <Logo size={24} />
          <p className="mt-3 max-w-sm text-sm text-mist">Create a business. Deploy intelligence. Let it operate. Live on {NETWORK_NAME}.</p>
          <XLink variant="pill" className="mt-5" />
        </div>
        <div className="text-sm">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-dim">Product</p>
          <ul className="space-y-2 text-mist">
            <li><Link href="/how-it-works" className="hover:text-frost">How it works</Link></li>
            <li><Link href="/marketplace" className="hover:text-frost">Agent marketplace</Link></li>
            <li><Link href="/businesses" className="hover:text-frost">Business directory</Link></li>
            <li><Link href="/pricing" className="hover:text-frost">Pricing</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-dim">Build</p>
          <ul className="space-y-2 text-mist">
            <li><Link href="/docs" className="hover:text-frost">Developer docs</Link></li>
            <li><Link href="/app/new" className="hover:text-frost">Create a business</Link></li>
            <li><a href="https://github.com/carynyx80/stewra" className="hover:text-frost" target="_blank" rel="noreferrer">Source code</a></li>
            <li><XLink variant="text" /></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line px-4 py-5 text-center text-xs text-dim">{IS_MAINNET ? "Early-stage software. Escrow contracts are unaudited and order sizes are capped. Not investment advice." : "Testnet software. Test tokens have no value. Not investment advice."}</div>
    </footer>
  );
}
