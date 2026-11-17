"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SectionTitle } from "@/components/ui";
import { OrderList } from "@/components/OrderList";
import { api } from "@/lib/api";
import { useMeta } from "@/lib/hooks";
import type { Order } from "@/lib/types";

export default function OrgOrdersPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const [role, setRole] = useState<"seller" | "buyer">("seller");
  const meta = useMeta();
  const q = useQuery({ queryKey: ["orders", orgId, role], queryFn: () => api<{ orders: Order[] }>(`/orders?orgId=${orgId}&role=${role}`), refetchInterval: 15_000 });
  return (
    <div>
      <SectionTitle
        eyebrow="Commerce"
        title="Service orders"
        body="Customer orders your workforce fulfils, and services your business has bought."
        action={
          <div className="flex gap-1 rounded-xl border border-line p-1 text-sm">
            {(["seller", "buyer"] as const).map((r) => (
              <button key={r} onClick={() => setRole(r)} className={`rounded-lg px-3 py-1 ${role === r ? "bg-white/[0.08] text-frost" : "text-mist"}`}>
                {r === "seller" ? "Sales" : "Purchases"}
              </button>
            ))}
          </div>
        }
      />
      <OrderList
        orders={q.data?.orders}
        loading={q.isLoading}
        error={q.error}
        decimals={meta.data?.chain.settlementToken?.decimals ?? 6}
        symbol={meta.data?.chain.settlementToken?.symbol ?? "tUSD"}
        emptyTitle={role === "seller" ? "No customer orders yet" : "No purchases yet"}
        emptyBody={role === "seller" ? "Publish a service and share your marketplace listing." : "Browse the marketplace and buy as this business."}
      />
    </div>
  );
}
