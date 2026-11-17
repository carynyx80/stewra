"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAccount, useConnect, useDisconnect, useSwitchChain, type Connector } from "wagmi";
import { ExternalLink, Loader2, LogOut, Wallet, X } from "lucide-react";
import { Button } from "./ui";
import { Mark } from "./Logo";
import { useAuth } from "@/lib/auth";
import { shortAddr } from "@/lib/format";
import { CHAIN_ID } from "@/lib/config";

function friendly(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/rejected|denied|cancel/i.test(msg)) return "Request was rejected in your wallet.";
  if (/already pending|-32002/i.test(msg)) return "Your wallet already has a pending request. Open the wallet to continue.";
  if (/provider not found|no provider|not installed/i.test(msg)) return "No wallet found in this browser.";
  if (/chain|network/i.test(msg) && /unrecognized|not added|4902|unsupported/i.test(msg)) return "Your wallet couldn't add Robinhood Chain. Add it manually and try again.";
  return msg.split("\n")[0].slice(0, 160) || "Something went wrong.";
}

/** Wallets announced through EIP-6963; the generic injected connector only when nothing announced itself. */
function useWalletList(connectors: readonly Connector[]) {
  return useMemo(() => {
    const announced = connectors.filter((c) => c.type === "injected" && c.id !== "injected");
    const generic = connectors.filter((c) => c.id === "injected");
    const list = announced.length ? announced : generic;
    const seen = new Set<string>();
    return list.filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)));
  }, [connectors]);
}

function isMobile() {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Connect wallet → switch to Robinhood Chain → sign the one-time nonce message. */
export function ConnectButton({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  // useAccount().chainId is the wallet's real chain, even when it's one we don't support
  const { address, isConnected, isConnecting, isReconnecting, chainId } = useAccount();
  const { switchChain, isPending: switching, error: switchError } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { session, signIn, signingIn, signOut, error } = useAuth();
  useEffect(() => setMounted(true), []);

  if (!mounted || isReconnecting) {
    return (
      <Button size={size} variant="secondary" disabled>
        <Loader2 className="h-4 w-4 animate-spin" /> Wallet
      </Button>
    );
  }

  // signed in: show identity even if the wallet extension is locked
  if (session && (!isConnected || address?.toLowerCase() === session.address.toLowerCase())) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-mist">
          <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-lime shadow-[0_0_8px_#b6da34]" : "bg-warn"}`} />
          {shortAddr(session.address)}
        </span>
        {isConnected && chainId !== CHAIN_ID && (
          <Button size="sm" variant="secondary" loading={switching} onClick={() => switchChain({ chainId: CHAIN_ID })}>
            Switch network
          </Button>
        )}
        {!isConnected && (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            Reconnect
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={signOut} aria-label="Sign out" title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
        <WalletModal open={open} onClose={() => setOpen(false)} />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <>
        <Button size={size} onClick={() => setOpen(true)} loading={isConnecting}>
          <Wallet className="h-4 w-4" /> Connect wallet
        </Button>
        <WalletModal open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  if (chainId !== CHAIN_ID) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <Button size={size} loading={switching} onClick={() => switchChain({ chainId: CHAIN_ID })}>
            Switch to Robinhood Chain
          </Button>
          <Button size="sm" variant="ghost" onClick={() => disconnect()} aria-label="Disconnect" title="Disconnect">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {switchError && <span className="max-w-64 text-right text-[11px] text-danger">{friendly(switchError)}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <Button size={size} onClick={signIn} loading={signingIn}>
          Sign in as {shortAddr(address)}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => disconnect()} aria-label="Disconnect" title="Disconnect">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {error && <span className="max-w-64 text-right text-[11px] text-danger">{error}</span>}
    </div>
  );
}

function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connectAsync, connectors } = useConnect();
  const wallets = useWalletList(connectors);
  const [, refresh] = useState(0);
  useEffect(() => {
    if (!open) return;
    const onAnnounce = () => setTimeout(() => refresh((n) => n + 1), 50);
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, [open]);
  const [pending, setPending] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const mobile = isMobile();

  useEffect(() => {
    if (!open) {
      setErr(null);
      setPending(null);
    }
  }, [open]);

  // only show the generic entry if a provider actually exists
  const hasInjected = typeof window !== "undefined" && Boolean((window as unknown as { ethereum?: unknown }).ethereum);
  const usable = wallets.filter((w) => w.id !== "injected" || hasInjected);

  const connect = async (c: Connector) => {
    setErr(null);
    setPending(c.uid);
    try {
      // connect first; the network switch is a separate, retryable step
      await connectAsync({ connector: c });
      onClose();
    } catch (e) {
      setErr(friendly(e));
    } finally {
      setPending(null);
    }
  };

  const here = typeof window !== "undefined" ? window.location.href.replace(/^https?:\/\//, "") : "";

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Connect a wallet"
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="glass relative w-full max-w-sm rounded-3xl bg-ink/90 p-6"
          >
            <button onClick={onClose} className="absolute right-4 top-4 text-dim hover:text-frost" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
            <div className="mb-5 flex items-center gap-3">
              <Mark size={28} />
              <div>
                <p className="font-display text-lg font-semibold">Connect a wallet</p>
                <p className="text-xs text-mist">Robinhood Chain · signing in is free</p>
              </div>
            </div>

            {usable.length > 0 ? (
              <ul className="space-y-2">
                {usable.map((w) => (
                  <li key={w.uid}>
                    <button
                      onClick={() => connect(w)}
                      disabled={Boolean(pending)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-left text-sm transition hover:border-lime/50 hover:bg-lime/[0.05] disabled:opacity-60"
                    >
                      {w.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={w.icon} alt="" className="h-7 w-7 rounded-lg" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                          <Wallet className="h-4 w-4 text-mist" />
                        </span>
                      )}
                      <span className="flex-1 font-medium">{w.id === "injected" ? "Browser wallet" : w.name}</span>
                      {pending === w.uid && <Loader2 className="h-4 w-4 animate-spin text-lime" />}
                    </button>
                  </li>
                ))}
              </ul>
            ) : mobile ? (
              <div className="space-y-2">
                <p className="mb-3 text-sm text-mist">Open Stewra inside your wallet app&apos;s browser:</p>
                {[
                  { name: "MetaMask", href: `https://metamask.app.link/dapp/${here}` },
                  { name: "Coinbase Wallet", href: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}` },
                  { name: "Trust Wallet", href: `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}` },
                ].map((l) => (
                  <a key={l.name} href={l.href} className="flex items-center justify-between rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-sm hover:border-lime/50">
                    {l.name} <ExternalLink className="h-4 w-4 text-dim" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="space-y-3 text-sm text-mist">
                <p>No wallet extension was found in this browser.</p>
                <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-frost hover:border-lime/50">
                  Install MetaMask <ExternalLink className="h-4 w-4 text-dim" />
                </a>
                <p className="text-xs text-dim">Any EVM wallet works (Rabby, Coinbase Wallet, Brave, OKX…). Reload this page after installing.</p>
              </div>
            )}

            {err && <p className="mt-4 rounded-xl border border-danger/25 bg-danger/[0.06] px-3 py-2 text-xs text-danger">{err}</p>}
            <p className="mt-5 text-center text-[11px] text-dim">Stewra never asks for your seed phrase or moves funds without your signature.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
