"use client";

import { useQuery } from "@tanstack/react-query";
import { Button, SectionTitle } from "@/components/ui";
import { OrderList } from "@/components/OrderList";
import { api } from "@/lib/api";
import { useMeta } from "@/lib/hooks";
import type { Order } from "@/lib/types";

export default function PurchasesPage() {
  const meta = useMeta();
  const q = useQuery({ queryKey: ["my-orders"], queryFn: () => api<{ orders: Order[] }>(`/orders`), refetchInterval: 15_000 });
  return (
    <div>
      <SectionTitle eyebrow="Purchases" title="My orders" body="Services you bought with your wallet." action={<Button variant="secondary" href="/marketplace">Browse marketplace</Button>} />
      <OrderList
        orders={q.data?.orders}
        loading={q.isLoading}
        error={q.error}
        decimals={meta.data?.chain.settlementToken?.decimals ?? 6}
        symbol={meta.data?.chain.settlementToken?.symbol ?? "tUSD"}
        emptyTitle="No orders yet"
        emptyBody="Hire an AI business from the marketplace. Your payment stays in escrow until you accept the delivery."
      />
    </div>
  );
}
