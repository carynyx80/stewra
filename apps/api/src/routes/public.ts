import type { FastifyInstance } from "fastify";
import { getAddress } from "viem";
import { z } from "zod";
import { prisma } from "../db.js";
import { notFound } from "../errors.js";
import { chainConfig, escrowReady } from "../chain.js";
import { providerConfigured } from "../ai/provider.js";
import { env } from "../env.js";
import { createNonce, requireUser, verifySignIn } from "../auth.js";
import { CATEGORIES } from "./commerce.js";

const publicAgentSelect = {
  id: true,
  orgId: true,
  name: true,
  role: true,
  department: true,
  description: true,
  model: true,
  tools: true,
  isOrchestrator: true,
  status: true,
  tasksCompleted: true,
  tasksFailed: true,
  createdAt: true,
} as const;

/**
 * Reputation derived only from settled, onchain-verified orders. Self-dealing
 * (buyer is a member of the seller org, or pays their own payout wallet) is
 * counted separately and never as verified.
 */
export async function reputationFor(orgId: string) {
  const orders = await prisma.serviceOrder.findMany({
    where: { sellerOrgId: orgId },
    select: { status: true, buyerUserId: true, buyerAddress: true, sellerAddress: true, buyerOrgId: true, isTest: true, receipt: { select: { id: true } }, review: { select: { rating: true, verified: true } } },
  });
  const members = new Set((await prisma.organizationMember.findMany({ where: { orgId }, select: { userId: true } })).map((m) => m.userId));
  const settled = orders.filter((o) => o.status === "ACCEPTED" && o.receipt);
  const selfDealt = (o: (typeof orders)[number]) => members.has(o.buyerUserId) || o.buyerOrgId === orgId || getAddress(o.buyerAddress) === getAddress(o.sellerAddress);
  const verified = settled.filter((o) => !selfDealt(o));
  const finished = orders.filter((o) => ["ACCEPTED", "REFUNDED", "DISPUTED"].includes(o.status));
  const verifiedRatings = verified.map((o) => o.review).filter((r): r is { rating: number; verified: boolean } => Boolean(r?.verified));
  const buyers = new Map<string, number>();
  for (const o of verified) buyers.set(o.buyerUserId, (buyers.get(o.buyerUserId) ?? 0) + 1);
  return {
    verifiedJobs: verified.length,
    verifiedTestnetJobs: verified.filter((o) => o.isTest).length,
    unverifiedJobs: settled.length - verified.length,
    disputes: orders.filter((o) => o.status === "DISPUTED").length,
    deliverySuccessRate: finished.length ? verified.length / finished.length : null,
    averageRating: verifiedRatings.length ? verifiedRatings.reduce((s, r) => s + r.rating, 0) / verifiedRatings.length : null,
    ratingCount: verifiedRatings.length,
    repeatCustomers: [...buyers.values()].filter((n) => n > 1).length,
  };
}

export async function publicRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: "stewra-api", time: new Date().toISOString() };
  });

  app.get("/meta", async () => ({
    chain: chainConfig(),
    escrowReady: escrowReady(),
    providerConfigured: providerConfigured(),
    mockMode: env.AGENT_MOCK_MODE,
    categories: CATEGORIES,
    features: {
      knowledgeSearch: "keyword",
      vectorSearch: "planned",
      payrollStreams: "planned",
      externalAgentApi: "planned",
      smartAccountTreasury: "planned",
    },
  }));

  /* ------------------------------------------------------------------ auth */

  app.post("/auth/nonce", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req) => {
    const { address } = z.object({ address: z.string() }).parse(req.body);
    return createNonce(address, req.headers.origin);
  });

  app.post("/auth/verify", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req) => {
    const input = z.object({ address: z.string(), nonce: z.string(), signature: z.string().regex(/^0x[0-9a-fA-F]+$/) }).parse(req.body);
    const { token, user } = await verifySignIn(input.address, input.nonce, input.signature as `0x${string}`);
    return { token, user };
  });

  app.get("/me", async (req) => {
    const auth = await requireUser(req);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.id } });
    return { user };
  });

  /* ---------------------------------------------------------- marketplace */

  app.get<{ Querystring: { category?: string; q?: string } }>("/public/listings", async (req) => {
    const q = req.query.q?.trim();
    const listings = await prisma.serviceListing.findMany({
      where: {
        active: true,
        org: { published: true },
        ...(req.query.category ? { category: req.query.category } : {}),
        ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { org: { select: { id: true, name: true, slug: true, logoUrl: true } }, agent: { select: { id: true, name: true, role: true } } },
    });
    const reps = new Map<string, Awaited<ReturnType<typeof reputationFor>>>();
    for (const l of listings) if (!reps.has(l.orgId)) reps.set(l.orgId, await reputationFor(l.orgId));
    return { listings: listings.map((l) => ({ ...l, reputation: reps.get(l.orgId) })), tokenDecimals: env.SETTLEMENT_TOKEN_DECIMALS, tokenSymbol: env.SETTLEMENT_TOKEN_SYMBOL };
  });

  app.get<{ Params: { listingId: string } }>("/public/listings/:listingId", async (req) => {
    const listing = await prisma.serviceListing.findFirst({
      where: { id: req.params.listingId, org: { published: true } },
      include: { org: { select: { id: true, name: true, slug: true, logoUrl: true, description: true } }, agent: { select: publicAgentSelect } },
    });
    if (!listing) throw notFound("Listing");
    const reviews = await prisma.customerReview.findMany({
      where: { order: { listingId: listing.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, rating: true, comment: true, verified: true, createdAt: true },
    });
    return { listing, reviews, reputation: await reputationFor(listing.orgId), tokenDecimals: env.SETTLEMENT_TOKEN_DECIMALS, tokenSymbol: env.SETTLEMENT_TOKEN_SYMBOL, escrowReady: escrowReady() };
  });

  app.get<{ Querystring: { q?: string; industry?: string } }>("/public/orgs", async (req) => {
    const q = req.query.q?.trim();
    const orgs = await prisma.organization.findMany({
      where: {
        published: true,
        ...(req.query.industry ? { industry: req.query.industry } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, slug: true, name: true, industry: true, description: true, logoUrl: true, createdAt: true, _count: { select: { agents: true, listings: true } } },
    });
    return { orgs };
  });

  app.get<{ Params: { slug: string } }>("/public/orgs/:slug", async (req) => {
    const org = await prisma.organization.findFirst({
      where: { slug: req.params.slug, published: true },
      select: { id: true, slug: true, name: true, industry: true, description: true, logoUrl: true, createdAt: true },
    });
    if (!org) throw notFound("Business");
    const [agents, listings, reputation] = await Promise.all([
      prisma.agent.findMany({ where: { orgId: org.id, isPublic: true }, select: publicAgentSelect, orderBy: [{ isOrchestrator: "desc" }, { createdAt: "asc" }] }),
      prisma.serviceListing.findMany({ where: { orgId: org.id, active: true } }),
      reputationFor(org.id),
    ]);
    return { org, agents, listings, reputation, tokenDecimals: env.SETTLEMENT_TOKEN_DECIMALS, tokenSymbol: env.SETTLEMENT_TOKEN_SYMBOL };
  });

  app.get<{ Params: { agentId: string } }>("/public/agents/:agentId", async (req) => {
    const agent = await prisma.agent.findFirst({
      where: { id: req.params.agentId, isPublic: true, org: { published: true } },
      select: { ...publicAgentSelect, org: { select: { id: true, name: true, slug: true } } },
    });
    if (!agent) throw notFound("Agent");
    const listings = await prisma.serviceListing.findMany({ where: { agentId: agent.id, active: true } });
    return { agent, listings, reputation: await reputationFor(agent.orgId), tokenDecimals: env.SETTLEMENT_TOKEN_DECIMALS, tokenSymbol: env.SETTLEMENT_TOKEN_SYMBOL };
  });
}
