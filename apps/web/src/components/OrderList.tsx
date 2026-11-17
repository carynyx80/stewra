"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { Badge, Empty, ErrorBox, LoadingBlock, StatusPill } from "./ui";
import { Glass } from "./liquid/Glass";
import { fromUnits, timeAgo } from "@/lib/format";
import type { Order } from "@/lib/types";

export function OrderList({ orders, loading, error, decimals, symbol, emptyTitle, emptyBody }: { orders?: Order[]; loading: boolean; error: unknown; decimals: number; symbol: string; emptyTitle: string; emptyBody: string }) {
  if (loading) return <LoadingBlock rows={3} />;
  if (error) return <ErrorBox error={error} />;
  if (!orders?.length) return <Empty icon={<Receipt className="h-5 w-5" />} title={emptyTitle} body={emptyBody} />;
  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <Link key={o.id} href={`/app/orders/${o.id}`} className="block">
          <Glass className="flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{o.listing?.title ?? "Service order"}</p>
              <p className="text-xs text-dim">
                {o.sellerOrg?.name} · {timeAgo(o.createdAt)} · #{o.id.slice(-6)}
              </p>
            </div>
            {o.isTest && <Badge tone="info">Test</Badge>}
            {o.receipt && <Badge tone="lime">Receipt</Badge>}
            <span className="font-mono text-sm">
              {fromUnits(o.amountUnits, decimals)} {symbol}
            </span>
            <StatusPill status={o.status} />
          </Glass>
        </Link>
      ))}
    </div>
  );
}
