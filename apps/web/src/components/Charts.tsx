"use client";

import { useState } from "react";
import { motion } from "framer-motion";

/** Minimal bar chart with hover readout. Values come straight from API records. */
export function MiniBars({ data, empty, format = (v) => String(v), height = 120 }: { data: { label: string; value: number }[]; empty: string; format?: (v: number) => string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length || data.every((d) => d.value === 0)) return <p className="py-8 text-center text-sm text-dim">{empty}</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const active = hover !== null ? data[hover] : data[data.length - 1];
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className="text-mist">{active.label}</span>
        <span className="font-mono text-frost">{format(active.value)}</span>
      </div>
      <div className="flex items-end gap-1" style={{ height }} onPointerLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div key={i} className="flex h-full flex-1 items-end" onPointerEnter={() => setHover(i)}>
            <motion.div
              className={`w-full rounded-t-[4px] ${hover === i ? "bg-lime-hi" : "bg-lime/70"}`}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max((d.value / max) * 100, d.value ? 4 : 1)}%` }}
              transition={{ duration: 0.8, delay: i * 0.02, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
