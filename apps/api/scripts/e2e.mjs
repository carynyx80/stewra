// End-to-end test: two businesses complete one paid, escrow-settled order on a local chain.
import { createPublicClient, createWalletClient, defineChain, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const API = "http://localhost:4100/v1";
const chain = defineChain({ id: 46630, name: "local", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } } });
const pub = createPublicClient({ chain, transport: http() });
// Anvil's well-known, prefunded development accounts (local chain only)
const KEYS = {
  seller: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  buyer: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  admin: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
};
const erc20 = parseAbi(["function approve(address,uint256) returns (bool)", "function faucet()", "function balanceOf(address) view returns (uint256)"]);
const escrowAbi = parseAbi(["function fund(bytes32,address,address,uint256,uint256,uint64)", "function accept(bytes32)"]);

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ✓", msg); } else { fail++; console.log("  ✗", msg); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path, { token, method, body } = {}) {
  const res = await fetch(API + path, {
    method: method ?? (body ? "POST" : "GET"),
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

async function signIn(key) {
  const account = privateKeyToAccount(key);
  const { nonce, message } = await call("/auth/nonce", { body: { address: account.address } });
  const signature = await account.signMessage({ message });
  const r = await call("/auth/verify", { body: { address: account.address, nonce, signature } });
  const replay = await call("/auth/verify", { body: { address: account.address, nonce, signature } });
  return { token: r.token, account, wallet: createWalletClient({ account, chain, transport: http() }), replayStatus: replay.status };
}

async function waitFor(fn, label, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const v = await fn();
    if (v) return v;
    await sleep(700);
  }
  throw new Error(`timeout: ${label}`);
}

async function send(wallet, req) {
  const hash = await wallet.writeContract(req);
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error("tx reverted");
  return hash;
}

console.log("\n1. Authentication");
const seller = await signIn(KEYS.seller);
const buyer = await signIn(KEYS.buyer);
ok(Boolean(seller.token && buyer.token), "wallet signature sign-in returns sessions");
ok(seller.replayStatus === 401, "reusing a signed nonce is rejected (replay protection)");
ok((await call("/orgs")).status === 401, "unauthenticated request is rejected");

console.log("\n2. Seller business, workforce and objective");
const sOrg = (await call("/orgs", { token: seller.token, body: { name: "Atlas Research", industry: "Research", description: "Autonomous research company producing market reports.", template: "research-company" } })).org;
ok(Boolean(sOrg?.id), "seller organization created");
const sAgents = (await call(`/orgs/${sOrg.id}/agents`, { token: seller.token })).agents;
ok(sAgents.length === 5 && sAgents.filter((a) => a.isOrchestrator).length === 1, "template workforce created with one orchestrator");
const obj = await call(`/orgs/${sOrg.id}/objectives`, { token: seller.token, body: { objective: "Write a short brief on the AI bookkeeping market." } });
ok(obj.status === 201 && !obj.needsApproval, "objective accepted and queued");
const done = await waitFor(async () => { const p = await call(`/projects/${obj.project.id}`, { token: seller.token }); return p.project.status === "COMPLETED" ? p : null; }, "objective completes");
ok(done.deliverables.length >= 1 && done.deliverables[0].isMock === true, "background worker executed the task and persisted a (labelled mock) deliverable");

console.log("\n3. Approval gate for over-budget objectives");
ok((await call(`/orgs/${sOrg.id}/policy`, { token: buyer.token, method: "PUT", body: { approvalThreshold: "0", dailySpendCap: "0", maxAgentRunCostUsd: 0.01, requireHiringApproval: true, delegatedSpendPaused: false } })).status === 403, "non-member cannot change another org's policy");
await call(`/orgs/${sOrg.id}/policy`, { token: seller.token, method: "PUT", body: { approvalThreshold: "0", dailySpendCap: "0", maxAgentRunCostUsd: 0.01, requireHiringApproval: true, delegatedSpendPaused: false } });
const gated = await call(`/orgs/${sOrg.id}/objectives`, { token: seller.token, body: { objective: "A larger objective that exceeds the per-run cap." } });
ok(gated.needsApproval === true, "objective above the cost cap waits for approval");
const pend = (await call(`/orgs/${sOrg.id}/approvals?status=PENDING`, { token: seller.token })).approvals;
ok(pend.length === 1, "approval appears in the inbox");
ok((await call(`/approvals/${pend[0].id}/decide`, { token: buyer.token, body: { decision: "APPROVED" } })).status === 403, "outsider cannot approve");
ok((await call(`/approvals/${pend[0].id}/decide`, { token: seller.token, body: { decision: "APPROVED" } })).ok === true, "owner approves");
await waitFor(async () => (await call(`/projects/${gated.project.id}`, { token: seller.token })).project.status === "COMPLETED", "approved objective runs");
ok(true, "approved objective executed after approval");
await call(`/orgs/${sOrg.id}/policy`, { token: seller.token, method: "PUT", body: { approvalThreshold: "0", dailySpendCap: "0", maxAgentRunCostUsd: 2, requireHiringApproval: true, delegatedSpendPaused: false } });

console.log("\n4. Marketplace listing and quote");
const listing = (await call(`/orgs/${sOrg.id}/listings`, { token: seller.token, body: { title: "Market research report", category: "Research", description: "A structured market research report on any topic you choose.", price: "10", inputFormat: "Topic and questions", outputFormat: "Markdown report", deliveryHours: 24 } })).listing;
ok(listing?.priceUnits === "10000000", "listing stored with base-unit price");
const pubListing = await call(`/public/listings/${listing.id}`);
ok(pubListing.listing?.id === listing.id && pubListing.escrowReady === true, "listing visible publicly with escrow ready");

const bOrg = (await call("/orgs", { token: buyer.token, body: { name: "Beacon Software", industry: "Software", description: "Autonomous software agency that buys research.", template: "software-agency" } })).org;
ok((await call(`/orgs/${sOrg.id}/agents`, { token: buyer.token })).status === 403, "org data is isolated between businesses");
ok((await call(`/listings/${listing.id}/quotes`, { token: seller.token, body: { requirements: "Self purchase attempt here", buyerOrgId: sOrg.id } })).status === 400, "an org cannot buy its own service");
const quote = (await call(`/listings/${listing.id}/quotes`, { token: buyer.token, body: { requirements: "Research the market for AI code review tools for small teams.", buyerOrgId: bOrg.id } })).quote;
ok(quote.feeUnits === "250000" && quote.feeBps === 250, "quote discloses a 2.5% platform fee");

console.log("\n5. Policy: split purchases by a non-owner admin need approval");
const admin = await signIn(KEYS.admin);
await call(`/orgs/${bOrg.id}/members`, { token: buyer.token, body: { address: admin.account.address, role: "ADMIN" } });
const aQuote = (await call(`/listings/${listing.id}/quotes`, { token: admin.token, body: { requirements: "Small research request number one.", buyerOrgId: bOrg.id } })).quote;
const aOrder = await call(`/quotes/${aQuote.id}/order`, { token: admin.token, method: "POST" });
ok(aOrder.status === 202 && aOrder.approvalRequired === true, "admin purchase is held for owner approval under the default policy");

console.log("\n6. Escrow order: fund → deliver → accept → receipt");
const created = await call(`/quotes/${quote.id}/order`, { token: buyer.token, method: "POST" });
ok(created.status === 201 && created.order.status === "AWAITING_FUNDING", "owner places the order");
ok((await call(`/quotes/${quote.id}/order`, { token: buyer.token, method: "POST" })).status === 409, "a quote cannot be used twice");
const c = created.escrowCall;
await send(buyer.wallet, { address: c.token, abi: erc20, functionName: "faucet" });
const total = BigInt(c.amount) + BigInt(c.fee);
await send(buyer.wallet, { address: c.token, abi: erc20, functionName: "approve", args: [c.escrowAddress, total] });
const bogus = await call(`/orders/${created.order.id}/funded`, { token: buyer.token, body: { txHash: "0x" + "ab".repeat(32) } });
ok(bogus.status === 400, "an unrelated transaction hash is rejected");
const fundHash = await send(buyer.wallet, { address: c.escrowAddress, abi: escrowAbi, functionName: "fund", args: [c.orderId, c.seller, c.token, BigInt(c.amount), BigInt(c.fee), BigInt(c.deadline)] });
ok((await call(`/orders/${created.order.id}/funded`, { token: seller.token, body: { txHash: fundHash } })).status === 403, "only the buyer can report funding");
const funded = await call(`/orders/${created.order.id}/funded`, { token: buyer.token, body: { txHash: fundHash } });
ok(funded.ok === true, "funding verified onchain by the API");
const delivered = await waitFor(async () => { const o = await call(`/orders/${created.order.id}`, { token: buyer.token }); return o.order.status === "DELIVERED" ? o : null; }, "seller agents deliver");
ok(delivered.order.deliverables.length === 1, "seller's AI workforce fulfilled the order and delivered to the buyer");
const sellerBefore = await pub.readContract({ address: c.token, abi: erc20, functionName: "balanceOf", args: [c.seller] });
const acceptHash = await send(buyer.wallet, { address: c.escrowAddress, abi: escrowAbi, functionName: "accept", args: [c.orderId] });
const accepted = await call(`/orders/${created.order.id}/accepted`, { token: buyer.token, body: { txHash: acceptHash } });
ok(accepted.ok === true, "release verified onchain");
const sellerAfter = await pub.readContract({ address: c.token, abi: erc20, functionName: "balanceOf", args: [c.seller] });
ok(sellerAfter - sellerBefore === BigInt(c.amount), "seller received exactly the service price onchain");
const final = await call(`/orders/${created.order.id}`, { token: buyer.token });
ok(final.order.status === "ACCEPTED" && final.order.receipt?.txHash === acceptHash, "payment receipt recorded against the settlement tx");

console.log("\n7. Reputation, treasury and dashboards");
const review = await call(`/orders/${created.order.id}/review`, { token: buyer.token, body: { rating: 5, comment: "Clear and useful." } });
ok(review.review?.verified === true, "review from an independent buyer is verified");
const rep = (await call(`/public/orgs/${sOrg.slug}`)).reputation;
ok(rep.verifiedJobs === 1 && rep.averageRating === 5, "public reputation counts the verified job");
const sTreasury = await call(`/orgs/${sOrg.id}/treasury`, { token: seller.token });
ok(sTreasury.transactions.some((t) => t.kind === "service_revenue"), "seller treasury shows the revenue transaction");
const bTreasury = await call(`/orgs/${bOrg.id}/treasury`, { token: buyer.token });
ok(bTreasury.transactions.some((t) => t.kind === "escrow_funded"), "buyer treasury shows the escrow funding");
const ov = await call(`/orgs/${sOrg.id}/overview`, { token: seller.token });
ok(ov.metrics.revenueUnits === "10000000", "command center revenue equals the settled amount");
const again = await call(`/orders/${created.order.id}/accepted`, { token: buyer.token, body: { txHash: acceptHash } });
ok(again.status === 409, "settlement reporting is idempotent (second report refused)");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
