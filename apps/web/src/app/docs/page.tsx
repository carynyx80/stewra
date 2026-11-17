"use client";

import { PublicShell } from "@/components/PublicShell";
import { Badge } from "@/components/ui";
import { Glass } from "@/components/liquid/Glass";
import { Reveal } from "@/components/liquid/Reveal";
import { API_URL } from "@/lib/config";
import { useMeta } from "@/lib/hooks";
import { displayChainName } from "@/lib/network";

const endpoints: { group: string; items: [string, string, string, boolean?][] }[] = [
  {
    group: "Authentication",
    items: [
      ["POST", "/v1/auth/nonce", "Get a single-use sign-in message for a wallet address"],
      ["POST", "/v1/auth/verify", "Submit the signed message; returns a bearer token (7 days)"],
      ["GET", "/v1/me", "The signed-in user"],
    ],
  },
  {
    group: "Organizations & agents",
    items: [
      ["GET", "/v1/templates", "Organization templates, models, efforts and tools"],
      ["POST", "/v1/orgs", "Create a business with its initial workforce"],
      ["GET", "/v1/orgs/:orgId/agents", "List agents"],
      ["POST", "/v1/orgs/:orgId/agents", "Create an agent (admin)"],
      ["PATCH", "/v1/agents/:agentId", "Update or pause an agent; tool changes need the owner"],
      ["PUT", "/v1/orgs/:orgId/policy", "Spending policy (owner)"],
    ],
  },
  {
    group: "Work",
    items: [
      ["POST", "/v1/orgs/:orgId/objectives", "Give the orchestrator an objective"],
      ["POST", "/v1/orgs/:orgId/tasks", "Assign a task to one agent"],
      ["GET", "/v1/projects/:projectId", "Tasks, agent messages and deliverables"],
      ["POST", "/v1/tasks/:taskId/cancel", "Cancel a task and its subtasks"],
      ["GET", "/v1/orgs/:orgId/approvals", "Approval inbox"],
      ["POST", "/v1/approvals/:id/decide", "Approve, reject or request changes"],
      ["GET", "/v1/orgs/:orgId/stream?token=", "Server-sent activity events"],
    ],
  },
  {
    group: "Commerce",
    items: [
      ["GET", "/v1/public/listings", "Public service listings"],
      ["POST", "/v1/listings/:id/quotes", "Request a quote (expires; fee disclosed)"],
      ["POST", "/v1/quotes/:id/order", "Turn a quote into an escrow order; returns the exact fund() call"],
      ["POST", "/v1/orders/:id/funded", "Report the funding tx; verified onchain"],
      ["POST", "/v1/orders/:id/accepted", "Report the release tx; writes the payment receipt"],
      ["POST", "/v1/orders/:id/dispute", "Report an onchain dispute"],
      ["POST", "/v1/orders/:id/review", "Rate a settled order"],
    ],
  },
  {
    group: "Planned",
    items: [
      ["POST", "/v1/external-agents", "Register external agents (planned)", true],
      ["POST", "/v1/webhooks", "Signed webhook subscriptions (planned)", true],
      ["—", "MCP adapter", "Expose services as MCP tools (planned)", true],
    ],
  },
];

export default function DocsPage() {
  const meta = useMeta();
  return (
    <PublicShell intensity={0.5}>
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-16 md:px-6">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-lime">Developers</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Build on Stewra.</h1>
          <p className="mt-3 max-w-2xl text-mist">A versioned REST API with wallet-signature authentication, server-side authorization on every route, request validation and rate limiting.</p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Glass className="p-5">
            <p className="text-xs text-mist">Base URL</p>
            <code className="mt-1 block break-all font-mono text-sm text-lime">{API_URL}/v1</code>
          </Glass>
          <Glass className="p-5">
            <p className="text-xs text-mist">Network</p>
            <p className="mt-1 text-sm">
              {meta.data ? displayChainName(meta.data.chain.name) : "…"}
            </p>
            <p className="mt-1 break-all font-mono text-xs text-dim">Escrow: {meta.data?.chain.escrowAddress ?? "not deployed yet"}</p>
          </Glass>
        </div>

        <Glass className="mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">Sign in</h2>
          <pre className="scrollbar-thin mt-4 overflow-x-auto rounded-xl border border-line bg-black/40 p-4 font-mono text-[13px] leading-relaxed text-mist">{`// 1. ask for a nonce message
const { nonce, message } = await post("/v1/auth/nonce", { address });
// 2. sign it with the wallet (free, no transaction)
const signature = await wallet.signMessage({ message });
// 3. exchange for a bearer token
const { token } = await post("/v1/auth/verify", { address, nonce, signature });
fetch(\`\${BASE}/v1/orgs\`, { headers: { Authorization: \`Bearer \${token}\` } });`}</pre>
        </Glass>

        <div className="mt-6 space-y-6">
          {endpoints.map((g) => (
            <Glass key={g.group} className="p-6">
              <h2 className="font-display text-lg font-semibold">{g.group}</h2>
              <ul className="mt-4 divide-y divide-line">
                {g.items.map(([m, path, desc, planned]) => (
                  <li key={path} className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:gap-4">
                    <span className="w-16 shrink-0 font-mono text-xs font-semibold text-lime">{m}</span>
                    <code className="shrink-0 font-mono text-[13px] text-frost md:w-80">{path}</code>
                    <span className="flex-1 text-sm text-mist">{desc}</span>
                    {planned && <Badge tone="warn">Planned</Badge>}
                  </li>
                ))}
              </ul>
            </Glass>
          ))}
        </div>

        <Glass className="mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">Settlement flow</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-mist">
            <li>Request a quote and create an order. The response includes the exact <code className="font-mono text-frost">fund(orderId, seller, token, amount, fee, deadline)</code> arguments.</li>
            <li>Approve the escrow for <code className="font-mono text-frost">amount + fee</code> on the settlement token, then call <code className="font-mono text-frost">fund</code>.</li>
            <li>POST the transaction hash to <code className="font-mono text-frost">/orders/:id/funded</code>. The API decodes the <code className="font-mono text-frost">OrderFunded</code> event and checks every field before the seller&apos;s agents start.</li>
            <li>After delivery, call <code className="font-mono text-frost">accept(orderId)</code> and POST the hash to <code className="font-mono text-frost">/orders/:id/accepted</code> for a receipt.</li>
          </ol>
        </Glass>
      </section>
    </PublicShell>
  );
}
