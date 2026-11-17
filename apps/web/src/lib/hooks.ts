"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, streamUrl } from "./api";
import type { ActivityEvent, Meta, Org, Role } from "./types";
import { useAuth } from "./auth";

export function useMeta() {
  return useQuery({ queryKey: ["meta"], queryFn: () => api<Meta>("/meta", { auth: false }), staleTime: 60_000 });
}

export function useOrgs() {
  const { session } = useAuth();
  return useQuery({ queryKey: ["orgs"], queryFn: () => api<{ orgs: Org[] }>("/orgs"), enabled: Boolean(session) });
}

export function useOrg(orgId: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["org", orgId],
    queryFn: () => api<{ org: Org & { members: { role: Role; user: { address: string } }[] }; role: Role }>(`/orgs/${orgId}`),
    enabled: Boolean(session && orgId),
  });
}

/** Live organization activity over server-sent events, with automatic reconnect. */
export function useActivityStream(orgId: string, onEvent?: (e: ActivityEvent) => void) {
  const { session } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const cb = useRef(onEvent);
  cb.current = onEvent;

  useEffect(() => {
    if (!session || !orgId) return;
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let closed = false;
    const open = () => {
      es = new EventSource(streamUrl(orgId));
      es.addEventListener("ready", () => setConnected(true));
      es.addEventListener("activity", (msg) => {
        const e = JSON.parse((msg as MessageEvent).data) as ActivityEvent;
        setEvents((prev) => [e, ...prev].slice(0, 100));
        cb.current?.(e);
      });
      es.onerror = () => {
        setConnected(false);
        es?.close();
        if (!closed) retry = setTimeout(open, 4000);
      };
    };
    open();
    return () => {
      closed = true;
      clearTimeout(retry);
      es?.close();
    };
  }, [orgId, session]);

  return { events, connected };
}
