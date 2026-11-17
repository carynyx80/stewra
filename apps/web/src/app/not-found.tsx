import Link from "next/link";
import { Mark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Mark size={56} glow />
      <h1 className="mt-6 font-display text-3xl font-semibold">Nothing here</h1>
      <p className="mt-2 text-mist">This page drifted away.</p>
      <Link href="/" className="mt-6 rounded-xl border border-line-strong px-4 py-2 text-sm hover:bg-white/5">
        Back to Stewra
      </Link>
    </div>
  );
}
