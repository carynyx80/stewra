"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useConnect, useSwitchChain } from "wagmi";
import { LogOut, Wallet } from "lucide-react";
import { Button } from "./ui";
import { useAuth } from "@/lib/auth";
import { shortAddr } from "@/lib/format";
import { CHAIN_ID } from "@/lib/config";

/** Connect wallet → switch to Robinhood Chain → sign the nonce message. */
export function ConnectButton({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { session, signIn, signingIn, signOut, error } = useAuth();
  useEffect(() => setMounted(true), []);

  if (!mounted) return <Button size={size} variant="secondary" disabled>Connect</Button>;

  if (!isConnected) {
    const injectedConnector = connectors[0];
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          size={size}
          onClick={() => injectedConnector && connect({ connector: injectedConnector, chainId: CHAIN_ID })}
          loading={isPending}
          disabled={!injectedConnector}
        >
          <Wallet className="h-4 w-4" /> Connect wallet
        </Button>
        {connectError && <span className="max-w-60 text-right text-[11px] text-danger">{/not found|provider/i.test(connectError.message) ? "No browser wallet found. Install MetaMask or a compatible wallet." : connectError.message.split("\n")[0]}</span>}
      </div>
    );
  }

  if (chainId !== CHAIN_ID) {
    return (
      <Button size={size} variant="secondary" loading={switching} onClick={() => switchChain({ chainId: CHAIN_ID })}>
        Switch to Robinhood Chain
      </Button>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button size={size} onClick={signIn} loading={signingIn}>
          Sign in as {shortAddr(address)}
        </Button>
        {error && <span className="max-w-60 text-right text-[11px] text-danger">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-mist sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-lime shadow-[0_0_8px_#b6da34]" />
        {shortAddr(session.address)}
      </span>
      <Button size="sm" variant="ghost" onClick={signOut} aria-label="Sign out">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
