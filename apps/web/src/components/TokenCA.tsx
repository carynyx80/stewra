"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { TOKEN_CA } from "./Social";

/** Contract address with one-tap copy. Full address shown so people can verify it. */
export function TokenCA() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN_CA);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: the address is still selectable */
    }
  };
  return (
    <button
      onClick={copy}
      title="Copy contract address"
      className="group inline-flex max-w-full items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-3 py-2 text-xs text-mist transition hover:border-lime/40 hover:text-frost"
    >
      <span className="font-semibold text-lime">CA:</span>
      <span className="select-all break-all text-left font-mono">{TOKEN_CA}</span>
      {copied ? <Check className="h-3.5 w-3.5 shrink-0 text-lime" /> : <Copy className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />}
    </button>
  );
}
