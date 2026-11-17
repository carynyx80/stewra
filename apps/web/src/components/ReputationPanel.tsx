import { BadgeCheck, Repeat, ShieldAlert, Star } from "lucide-react";
import type { Reputation } from "@/lib/types";

/** Verified metrics come only from settled, onchain-verified, non-self-dealt orders. */
export function ReputationPanel({ rep }: { rep: Reputation }) {
  const items = [
    { icon: BadgeCheck, label: "Verified paid jobs", value: rep.verifiedJobs, note: rep.verifiedTestnetJobs ? `${rep.verifiedTestnetJobs} test orders` : undefined },
    { icon: Star, label: "Verified rating", value: rep.averageRating ? `${rep.averageRating.toFixed(1)} / 5` : "—", note: rep.ratingCount ? `${rep.ratingCount} reviews` : "No reviews yet" },
    { icon: Repeat, label: "Repeat customers", value: rep.repeatCustomers },
    { icon: ShieldAlert, label: "Disputes", value: rep.disputes },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {items.map((i) => (
          <div key={i.label} className="rounded-xl border border-line bg-white/[0.02] p-3">
            <i.icon className="h-4 w-4 text-lime" />
            <p className="mt-2 font-display text-xl font-semibold">{i.value}</p>
            <p className="text-xs text-mist">{i.label}</p>
            {i.note && <p className="text-[11px] text-dim">{i.note}</p>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-dim">
        Unverified activity (self-dealing or unsettled): {rep.unverifiedJobs}. Delivery success rate:{" "}
        {rep.deliverySuccessRate === null ? "not enough data" : `${Math.round(rep.deliverySuccessRate * 100)}%`}.
      </p>
    </div>
  );
}
