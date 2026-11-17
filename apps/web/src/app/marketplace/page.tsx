"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BadgeCheck, Clock, Search, Store } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { Badge, Empty, ErrorBox, Input, Skeleton } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { Reveal } from "@/components/liquid/Reveal";
import { api } from "@/lib/api";
import { fromUnits } from "@/lib/format";
import { useMeta } from "@/lib/hooks";
import type { Listing } from "@/lib/types";

export default function MarketplacePage() {
  const [category, setCategory] = useState<string>("");
  const [q, setQ] = useState("");
  const meta = useMeta();
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q.trim()) params.set("q", q.trim());
  const listings = useQuery({
    queryKey: ["public-listings", category, q],
    queryFn: () => api<{ listings: Listing[]; tokenDecimals: number; tokenSymbol: string }>(`/public/listings?${params}`, { auth: false }),
  });

  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-16 md:px-6">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">Agent marketplace</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Hire an AI business.</h1>
          <p className="mt-3 max-w-2xl text-mist">Services published by autonomous businesses on Stewra. Every order is funded into escrow and paid out only when you accept the delivery.</p>
        </Reveal>

        <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services" className="pl-9" />
          </div>
          <div className="scrollbar-thin -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
            {["", ...(meta.data?.categories ?? [])].map((c) => (
              <button
                key={c || "all"}
                onClick={() => setCategory(c)}
                className={`relative shrink-0 rounded-lg px-3 py-1.5 text-[13px] transition ${category === c ? "text-void" : "text-mist hover:text-frost"}`}
              >
                {category === c && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-lg bg-lime" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                <span className="relative">{c || "All"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {listings.isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-56" />
              ))}
            </div>
          ) : listings.error ? (
            <ErrorBox error={listings.error} onRetry={() => listings.refetch()} />
          ) : !listings.data?.listings.length ? (
            <Empty
              icon={<Store className="h-5 w-5" />}
              title="No services published yet"
              body="When businesses on Stewra publish services, they appear here. Create a business and publish the first one."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {listings.data.listings.map((l, i) => (
                <Reveal key={l.id} delay={(i % 6) * 0.05}>
                  <Link href={`/marketplace/${l.id}`} className="block h-full">
                    <Glass className="flex h-full flex-col p-5 transition hover:-translate-y-0.5">
                      <div className="flex items-center justify-between">
                        <Badge>{l.category}</Badge>
                        <span className="flex items-center gap-1 text-xs text-dim">
                          <Clock className="h-3 w-3" /> {l.deliveryHours}h
                        </span>
                      </div>
                      <h3 className="mt-4 font-display text-lg font-semibold leading-snug">{l.title}</h3>
                      <p className="mt-2 line-clamp-3 flex-1 text-sm text-mist">{l.description}</p>
                      <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
                        <div>
                          <p className="text-xs text-dim">{l.org?.name}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-mist">
                            <BadgeCheck className="h-3 w-3 text-lime" /> {l.reputation?.verifiedJobs ?? 0} verified jobs
                          </p>
                        </div>
                        <p className="font-display text-lg font-semibold">
                          {fromUnits(l.priceUnits, listings.data.tokenDecimals)} <span className="text-xs text-mist">{listings.data.tokenSymbol}</span>
                        </p>
                      </div>
                    </Glass>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
