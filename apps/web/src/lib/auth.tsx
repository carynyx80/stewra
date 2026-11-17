"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { api, getToken, setToken } from "./api";

interface Session {
  token: string;
  address: string;
  userId: string;
}

interface AuthState {
  session: Session | null;
  ready: boolean;
  signingIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function decode(token: string): Session | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp * 1000 < Date.now()) return null;
    return { token, address: payload.addr, userId: payload.sub };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    const s = t ? decode(t) : null;
    if (!s && t) setToken(null);
    setSession(s);
    setReady(true);
  }, []);

  // a session belongs to one wallet: switching accounts ends it
  useEffect(() => {
    if (!ready || !session || !address) return;
    if (address.toLowerCase() !== session.address.toLowerCase()) {
      setToken(null);
      setSession(null);
      qc.clear();
    }
  }, [address, ready, session, qc]);

  const signIn = useCallback(async () => {
    if (!address || !isConnected) {
      setError("Connect a wallet first.");
      return;
    }
    setError(null);
    setSigningIn(true);
    try {
      const { nonce, message } = await api<{ nonce: string; message: string }>("/auth/nonce", { body: { address }, auth: false });
      const signature = await signMessageAsync({ message });
      const { token } = await api<{ token: string }>("/auth/verify", { body: { address, nonce, signature }, auth: false });
      setToken(token);
      setSession(decode(token));
      qc.invalidateQueries();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/rejected|denied/i.test(msg) ? "Signature request was rejected." : msg);
    } finally {
      setSigningIn(false);
    }
  }, [address, isConnected, signMessageAsync, qc]);

  const signOut = useCallback(() => {
    setToken(null);
    setSession(null);
    qc.clear();
    disconnect();
  }, [disconnect, qc]);

  const value = useMemo(() => ({ session, ready, signingIn, error, signIn, signOut }), [session, ready, signingIn, error, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
