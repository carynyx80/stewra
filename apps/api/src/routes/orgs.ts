import type { FastifyInstance } from "fastify";
import { getAddress, isAddress } from "viem";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireUser } from "../auth.js";
import { requireOrgRole } from "../access.js";
import { audit, emitActivity } from "../activity.js";
import { badRequest, conflict, notFound } from "../errors.js";
import { ALL_TOOLS, TEMPLATES, templateById } from "../templates.js";
import { EFFORTS, SUPPORTED_MODELS } from "../ai/provider.js";
import { env } from "../env.js";
import { toUnits } from "../money.js";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "org";

const amount = z.string().regex(/^\d+(\.\d+)?$/, "Use a plain decimal amount like 25 or 12.5");
const modelId = z.enum(SUPPORTED_MODELS.map((m) => m.id) as [string, ...string[]]);

const createOrg = z.object({
  name: z.string().min(2).max(80),
  industry: z.string().min(2).max(60),
  description: z.string().min(10).max(2000),
  template: z.string(),
  logoUrl: z.string().url().max(500).optional().or(z.literal("")),
  objectives: z.string().max(2000).optional(),
  agentRoles: z.array(z.string()).optional(), // subset of template agent roles to create; default all
  published: z.boolean().default(true),
});

const agentInput = z.object({
  name: z.string().min(2).max(80),
  role: z.string().min(2).max(60),
  department: z.string().min(2).max(60).default("Operations"),
  description: z.string().min(5).max(1000),
  model: modelId.default(env.DEFAULT_MODEL),
  effort: z.enum(EFFORTS).default("medium"),
  systemPrompt: z.string().min(10).max(8000),
  tools: z.array(z.enum(ALL_TOOLS as [string, ...string[]])).default(["search_knowledge", "submit_deliverable"]),
  isOrchestrator: z.boolean().default(false),
  spendLimit: amount.default("0"),
  isPublic: z.boolean().default(true),
});

const policyInput = z.object({
  approvalThreshold: amount,
  dailySpendCap: amount,
  maxAgentRunCostUsd: z.number().min(0.01).max(100),
  requireHiringApproval: z.boolean(),
  delegatedSpendPaused: z.boolean(),
});

export async function orgRoutes(app: FastifyInstance) {
  app.get("/templates", async () => ({
    templates: TEMPLATES.map((t) => ({
      ...t,
      agents: t.agents.map(({ instructions, ...a }) => ({ ...a, instructionsPreview: instructions.slice(0, 160) })),
    })),
    models: SUPPORTED_MODELS,
    efforts: EFFORTS,
    tools: ALL_TOOLS,
  }));

  app.get("/orgs", async (req) => {
    const user = await requireUser(req);
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: { org: { include: { _count: { select: { agents: true, tasks: true } } } } },
      orderBy: { createdAt: "asc" },
    });
    return { orgs: memberships.map((m) => ({ ...m.org, role: m.role })) };
  });

  app.post("/orgs", async (req, reply) => {
    const user = await requireUser(req);
    const input = createOrg.parse(req.body);
    const template = templateById(input.template);
    if (!template) throw badRequest("Unknown template");
    const blueprints = input.agentRoles?.length ? template.agents.filter((a) => input.agentRoles!.includes(a.role)) : template.agents;
    if (!blueprints.length) throw badRequest("Select at least one agent");

    let slug = slugify(input.name);
    if (await prisma.organization.findUnique({ where: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          slug,
          name: input.name,
          industry: input.industry,
          description: input.description,
          template: template.id,
          logoUrl: input.logoUrl || null,
          objectives: input.objectives ?? "",
          published: input.published,
          ownerId: user.id,
          members: { create: { userId: user.id, role: "OWNER" } },
          policy: { create: {} },
        },
      });
      for (const b of blueprints) {
        await tx.agent.create({
          data: {
            orgId: created.id,
            name: b.name,
            role: b.role,
            department: b.department,
            description: b.description,
            systemPrompt: b.instructions,
            tools: b.tools,
            isOrchestrator: Boolean(b.isOrchestrator),
            model: env.DEFAULT_MODEL,
          },
        });
      }
      return created;
    });
    await audit(org.id, "user", user.id, "org.created", org.id);
    await emitActivity(org.id, "org.created", `${org.name} was created with ${blueprints.length} agents`);
    reply.code(201);
    return { org };
  });

  app.get<{ Params: { orgId: string } }>("/orgs/:orgId", async (req) => {
    const user = await requireUser(req);
    const membership = await requireOrgRole(req.params.orgId, user.id);
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: req.params.orgId },
      include: { policy: true, members: { include: { user: { select: { id: true, address: true, displayName: true } } } } },
    });
    return { org, role: membership.role };
  });

  app.patch<{ Params: { orgId: string } }>("/orgs/:orgId", async (req) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id, "ADMIN");
    const input = createOrg
      .pick({ name: true, industry: true, description: true, logoUrl: true, objectives: true, published: true })
      .partial()
      .parse(req.body);
    const org = await prisma.organization.update({ where: { id: req.params.orgId }, data: { ...input, logoUrl: input.logoUrl === "" ? null : input.logoUrl } });
    await audit(org.id, "user", user.id, "org.updated", org.id, input);
    return { org };
  });

  app.put<{ Params: { orgId: string } }>("/orgs/:orgId/policy", async (req) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id, "OWNER");
    const input = policyInput.parse(req.body);
    const d = env.SETTLEMENT_TOKEN_DECIMALS;
    const policy = await prisma.organizationPolicy.upsert({
      where: { orgId: req.params.orgId },
      create: {
        orgId: req.params.orgId,
        approvalThreshold: toUnits(input.approvalThreshold, d),
        dailySpendCap: toUnits(input.dailySpendCap, d),
        maxAgentRunCostMicros: Math.round(input.maxAgentRunCostUsd * 1e6),
        requireHiringApproval: input.requireHiringApproval,
        delegatedSpendPaused: input.delegatedSpendPaused,
      },
      update: {
        approvalThreshold: toUnits(input.approvalThreshold, d),
        dailySpendCap: toUnits(input.dailySpendCap, d),
        maxAgentRunCostMicros: Math.round(input.maxAgentRunCostUsd * 1e6),
        requireHiringApproval: input.requireHiringApproval,
        delegatedSpendPaused: input.delegatedSpendPaused,
      },
    });
    await audit(req.params.orgId, "user", user.id, "policy.updated", req.params.orgId, input);
    await emitActivity(req.params.orgId, "policy.updated", input.delegatedSpendPaused ? "Delegated spending paused" : "Treasury policy updated");
    return { policy };
  });

  app.put<{ Params: { orgId: string } }>("/orgs/:orgId/treasury-address", async (req) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id, "OWNER");
    const { address } = z.object({ address: z.string() }).parse(req.body);
    if (!isAddress(address)) throw badRequest("Invalid treasury address");
    const org = await prisma.organization.update({ where: { id: req.params.orgId }, data: { treasuryAddress: getAddress(address) } });
    await audit(org.id, "user", user.id, "treasury.address_set", getAddress(address));
    return { org };
  });

  app.post<{ Params: { orgId: string } }>("/orgs/:orgId/members", async (req, reply) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id, "ADMIN");
    const input = z.object({ address: z.string(), role: z.enum(["ADMIN", "MEMBER"]) }).parse(req.body);
    if (!isAddress(input.address)) throw badRequest("Invalid wallet address");
    const member = await prisma.user.upsert({ where: { address: getAddress(input.address) }, create: { address: getAddress(input.address) }, update: {} });
    const existing = await prisma.organizationMember.findUnique({ where: { orgId_userId: { orgId: req.params.orgId, userId: member.id } } });
    if (existing) throw conflict("That wallet is already a member");
    await prisma.organizationMember.create({ data: { orgId: req.params.orgId, userId: member.id, role: input.role } });
    await audit(req.params.orgId, "user", user.id, "member.added", member.address, { role: input.role });
    reply.code(201);
    return { ok: true };
  });

  /* ---------------------------------------------------------------- agents */

  app.get<{ Params: { orgId: string } }>("/orgs/:orgId/agents", async (req) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id);
    const agents = await prisma.agent.findMany({ where: { orgId: req.params.orgId }, orderBy: [{ isOrchestrator: "desc" }, { createdAt: "asc" }] });
    return { agents };
  });

  app.post<{ Params: { orgId: string } }>("/orgs/:orgId/agents", async (req, reply) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id, "ADMIN");
    const input = agentInput.parse(req.body);
    const agent = await prisma.agent.create({
      data: { ...input, orgId: req.params.orgId, spendLimit: toUnits(input.spendLimit, env.SETTLEMENT_TOKEN_DECIMALS) },
    });
    await audit(req.params.orgId, "user", user.id, "agent.created", agent.id);
    await emitActivity(req.params.orgId, "agent.created", `${agent.name} joined the workforce`, { agentId: agent.id });
    reply.code(201);
    return { agent };
  });

  app.get<{ Params: { agentId: string } }>("/agents/:agentId", async (req) => {
    const user = await requireUser(req);
    const agent = await prisma.agent.findUnique({ where: { id: req.params.agentId } });
    if (!agent) throw notFound("Agent");
    await requireOrgRole(agent.orgId, user.id);
    const [tasks, executions, memories] = await Promise.all([
      prisma.task.findMany({ where: { agentId: agent.id }, orderBy: { createdAt: "desc" }, take: 30 }),
      prisma.agentExecution.findMany({ where: { agentId: agent.id }, orderBy: { startedAt: "desc" }, take: 30 }),
      prisma.agentMemory.findMany({ where: { agentId: agent.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);
    return { agent, tasks, executions, memories };
  });

  app.patch<{ Params: { agentId: string } }>("/agents/:agentId", async (req) => {
    const user = await requireUser(req);
    const existing = await prisma.agent.findUnique({ where: { id: req.params.agentId } });
    if (!existing) throw notFound("Agent");
    await requireOrgRole(existing.orgId, user.id, "ADMIN");
    const input = agentInput.partial().extend({ status: z.enum(["IDLE", "PAUSED"]).optional() }).parse(req.body);
    // granting tools changes an agent's permissions: owner only
    if (input.tools || input.isOrchestrator !== undefined) await requireOrgRole(existing.orgId, user.id, "OWNER");
    const agent = await prisma.agent.update({
      where: { id: existing.id },
      data: { ...input, spendLimit: input.spendLimit ? toUnits(input.spendLimit, env.SETTLEMENT_TOKEN_DECIMALS) : undefined },
    });
    await audit(existing.orgId, "user", user.id, "agent.updated", agent.id, input);
    return { agent };
  });

  /* ------------------------------------------------------------- knowledge */

  app.get<{ Params: { orgId: string } }>("/orgs/:orgId/knowledge", async (req) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id);
    const docs = await prisma.knowledgeDocument.findMany({
      where: { orgId: req.params.orgId },
      select: { id: true, title: true, sizeBytes: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return { documents: docs };
  });

  app.post<{ Params: { orgId: string } }>("/orgs/:orgId/knowledge", async (req, reply) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id, "ADMIN");
    const input = z.object({ title: z.string().min(1).max(200), content: z.string().min(1).max(500_000) }).parse(req.body);
    const doc = await prisma.knowledgeDocument.create({
      data: { orgId: req.params.orgId, title: input.title, content: input.content, sizeBytes: Buffer.byteLength(input.content) },
    });
    await audit(req.params.orgId, "user", user.id, "knowledge.uploaded", doc.id);
    reply.code(201);
    return { document: { id: doc.id, title: doc.title, sizeBytes: doc.sizeBytes, createdAt: doc.createdAt } };
  });

  app.delete<{ Params: { orgId: string; docId: string } }>("/orgs/:orgId/knowledge/:docId", async (req) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id, "ADMIN");
    const deleted = await prisma.knowledgeDocument.deleteMany({ where: { id: req.params.docId, orgId: req.params.orgId } });
    if (!deleted.count) throw notFound("Document");
    await audit(req.params.orgId, "user", user.id, "knowledge.deleted", req.params.docId);
    return { ok: true };
  });
}
