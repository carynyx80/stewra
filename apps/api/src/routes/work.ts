import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireUser, verifyToken } from "../auth.js";
import { requireOrgRole } from "../access.js";
import { audit, emitActivity } from "../activity.js";
import { badRequest, conflict, notFound } from "../errors.js";
import { enqueue } from "../queue.js";
import { cancelTaskTree } from "../ai/engine.js";
import { providerConfigured } from "../ai/provider.js";
import { env } from "../env.js";

/** Rough pre-run estimate (USD micros) shown before work starts: one planning and one synthesis run, plus one run per specialist. */
const ESTIMATE_PER_RUN_MICROS = 150_000;

export async function workRoutes(app: FastifyInstance) {
  /* ------------------------------------------------------------ objectives */

  app.post<{ Params: { orgId: string } }>("/orgs/:orgId/objectives", async (req, reply) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id, "ADMIN");
    const input = z.object({ objective: z.string().min(10).max(8000), title: z.string().min(2).max(160).optional() }).parse(req.body);

    const [orchestrator, specialists, policy] = await Promise.all([
      prisma.agent.findFirst({ where: { orgId: req.params.orgId, isOrchestrator: true, status: { not: "PAUSED" } }, orderBy: { createdAt: "asc" } }),
      prisma.agent.count({ where: { orgId: req.params.orgId, isOrchestrator: false, status: { not: "PAUSED" } } }),
      prisma.organizationPolicy.findUnique({ where: { orgId: req.params.orgId } }),
    ]);
    if (!orchestrator) throw badRequest("This organization needs an active orchestrator agent (e.g. a CEO agent) to run objectives.");

    const estimateMicros = (2 + specialists) * ESTIMATE_PER_RUN_MICROS;
    const capMicros = policy?.maxAgentRunCostMicros ?? 2_000_000;
    const needsApproval = estimateMicros > capMicros;
    const title = input.title ?? input.objective.split("\n")[0].slice(0, 120);

    const { project, task } = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: { orgId: req.params.orgId, title, objective: input.objective, status: needsApproval ? "PLANNING" : "ACTIVE", createdById: user.id },
      });
      const task = await tx.task.create({
        data: {
          orgId: req.params.orgId,
          projectId: project.id,
          agentId: orchestrator.id,
          title,
          instructions: `Objective from the business owner:\n\n${input.objective}\n\nPlan the work, delegate to the right specialists, then assemble and submit the final deliverable.`,
          status: needsApproval ? "PENDING_APPROVAL" : "QUEUED",
        },
      });
      return { project, task };
    });

    if (needsApproval) {
      await prisma.approval.create({
        data: {
          orgId: req.params.orgId,
          agentId: orchestrator.id,
          taskId: task.id,
          action: "Run objective",
          reason: `Estimated model cost of $${(estimateMicros / 1e6).toFixed(2)} exceeds the per-run cap of $${(capMicros / 1e6).toFixed(2)}.`,
          consequences: `${orchestrator.name} will plan and delegate work for: “${title}”. Model usage is billed to the platform's provider account.`,
          payload: { kind: "run_task", taskId: task.id },
          expiresAt: new Date(Date.now() + 72 * 3600_000),
        },
      });
      await emitActivity(req.params.orgId, "approval.requested", `Objective “${title}” is waiting for approval`, { taskId: task.id });
    } else {
      await enqueue("task.execute", { taskId: task.id });
      await emitActivity(req.params.orgId, "project.started", `Objective started: “${title}”`, { projectId: project.id });
    }
    await audit(req.params.orgId, "user", user.id, "objective.created", project.id);
    reply.code(201);
    return { project, task, estimateMicros, needsApproval, providerConfigured: providerConfigured() || env.AGENT_MOCK_MODE };
  });

  /* -------------------------------------------------------------- projects */

  app.get<{ Params: { orgId: string } }>("/orgs/:orgId/projects", async (req) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id);
    const projects = await prisma.project.findMany({
      where: { orgId: req.params.orgId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { tasks: { select: { status: true, costMicros: true } } },
    });
    return {
      projects: projects.map(({ tasks, ...p }) => ({
        ...p,
        taskCount: tasks.length,
        completedCount: tasks.filter((t) => t.status === "COMPLETED").length,
        costMicros: tasks.reduce((s, t) => s + t.costMicros, 0),
      })),
    };
  });

  app.get<{ Params: { projectId: string } }>("/projects/:projectId", async (req) => {
    const user = await requireUser(req);
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) throw notFound("Project");
    await requireOrgRole(project.orgId, user.id);
    const [tasks, messages, deliverables] = await Promise.all([
      prisma.task.findMany({
        where: { projectId: project.id },
        orderBy: { createdAt: "asc" },
        include: { agent: { select: { id: true, name: true, role: true } }, executions: { orderBy: { startedAt: "asc" } } },
      }),
      prisma.agentMessage.findMany({ where: { task: { projectId: project.id } }, orderBy: { createdAt: "asc" }, take: 500 }),
      prisma.deliverable.findMany({ where: { task: { projectId: project.id } }, orderBy: { createdAt: "asc" } }),
    ]);
    return { project, tasks, messages, deliverables };
  });

  /* ----------------------------------------------------------------- tasks */

  app.get<{ Params: { orgId: string }; Querystring: { status?: string } }>("/orgs/:orgId/tasks", async (req) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id);
    const tasks = await prisma.task.findMany({
      where: { orgId: req.params.orgId, ...(req.query.status ? { status: req.query.status as never } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { agent: { select: { id: true, name: true } } },
    });
    return { tasks };
  });

  app.post<{ Params: { orgId: string } }>("/orgs/:orgId/tasks", async (req, reply) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id, "ADMIN");
    const input = z.object({ agentId: z.string(), title: z.string().min(2).max(200), instructions: z.string().min(5).max(20000) }).parse(req.body);
    const agent = await prisma.agent.findFirst({ where: { id: input.agentId, orgId: req.params.orgId } });
    if (!agent) throw notFound("Agent");
    const project = await prisma.project.create({ data: { orgId: req.params.orgId, title: input.title, objective: input.instructions, status: "ACTIVE", createdById: user.id } });
    const task = await prisma.task.create({
      data: { orgId: req.params.orgId, projectId: project.id, agentId: agent.id, title: input.title, instructions: input.instructions, status: "QUEUED" },
    });
    await enqueue("task.execute", { taskId: task.id });
    await emitActivity(req.params.orgId, "task.queued", `“${task.title}” assigned to ${agent.name}`, { taskId: task.id });
    await audit(req.params.orgId, "user", user.id, "task.created", task.id);
    reply.code(201);
    return { task, project };
  });

  app.get<{ Params: { taskId: string } }>("/tasks/:taskId", async (req) => {
    const user = await requireUser(req);
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: { agent: true, executions: true, deliverables: true, subtasks: { include: { agent: { select: { name: true } } } } },
    });
    if (!task) throw notFound("Task");
    await requireOrgRole(task.orgId, user.id);
    const messages = await prisma.agentMessage.findMany({ where: { taskId: task.id }, orderBy: { createdAt: "asc" } });
    const { systemPrompt: _hidden, ...agent } = task.agent ?? ({} as Record<string, unknown>);
    return { task: { ...task, agent: task.agent ? agent : null }, messages };
  });

  app.post<{ Params: { taskId: string } }>("/tasks/:taskId/cancel", async (req) => {
    const user = await requireUser(req);
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) throw notFound("Task");
    await requireOrgRole(task.orgId, user.id, "ADMIN");
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(task.status)) throw conflict(`Task is already ${task.status.toLowerCase()}`);
    const count = await cancelTaskTree(task.id);
    if (task.projectId && !task.parentTaskId) await prisma.project.update({ where: { id: task.projectId }, data: { status: "CANCELLED" } });
    await emitActivity(task.orgId, "task.cancelled", `“${task.title}” was cancelled`, { taskId: task.id });
    await audit(task.orgId, "user", user.id, "task.cancelled", task.id, { count });
    return { ok: true, cancelled: count };
  });

  app.post<{ Params: { taskId: string } }>("/tasks/:taskId/retry", async (req) => {
    const user = await requireUser(req);
    const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
    if (!task) throw notFound("Task");
    await requireOrgRole(task.orgId, user.id, "ADMIN");
    if (!["FAILED", "CANCELLED"].includes(task.status)) throw conflict("Only failed or cancelled tasks can be retried");
    await prisma.task.update({ where: { id: task.id }, data: { status: "QUEUED", attempts: 0, error: null, completedAt: null } });
    if (task.projectId && !task.parentTaskId) await prisma.project.update({ where: { id: task.projectId }, data: { status: "ACTIVE" } });
    await enqueue("task.execute", { taskId: task.id });
    await audit(task.orgId, "user", user.id, "task.retried", task.id);
    return { ok: true };
  });

  /* ------------------------------------------------------------- approvals */

  app.get<{ Params: { orgId: string }; Querystring: { status?: string } }>("/orgs/:orgId/approvals", async (req) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id);
    const approvals = await prisma.approval.findMany({
      where: { orgId: req.params.orgId, ...(req.query.status ? { status: req.query.status as never } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const agentIds = [...new Set(approvals.map((a) => a.agentId).filter(Boolean))] as string[];
    const agents = await prisma.agent.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true, role: true } });
    return { approvals: approvals.map((a) => ({ ...a, agent: agents.find((g) => g.id === a.agentId) ?? null })) };
  });

  app.post<{ Params: { approvalId: string } }>("/approvals/:approvalId/decide", async (req) => {
    const user = await requireUser(req);
    const input = z.object({ decision: z.enum(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]), note: z.string().max(2000).optional() }).parse(req.body);
    const approval = await prisma.approval.findUnique({ where: { id: req.params.approvalId } });
    if (!approval) throw notFound("Approval");
    // approvals are an owner/admin decision enforced here, not just a disabled button
    await requireOrgRole(approval.orgId, user.id, "ADMIN");
    if (approval.status !== "PENDING") throw conflict(`Approval is already ${approval.status.toLowerCase()}`);
    if (approval.expiresAt < new Date()) {
      await prisma.approval.update({ where: { id: approval.id }, data: { status: "EXPIRED" } });
      throw conflict("This approval request has expired");
    }
    const claimed = await prisma.approval.updateMany({
      where: { id: approval.id, status: "PENDING" },
      data: { status: input.decision, decidedById: user.id, decidedAt: new Date(), decisionNote: input.note },
    });
    if (!claimed.count) throw conflict("Approval was decided concurrently");

    const payload = (approval.payload ?? {}) as { kind?: string; taskId?: string };
    if (payload.kind === "run_task" && payload.taskId) {
      if (input.decision === "APPROVED") {
        const moved = await prisma.task.updateMany({ where: { id: payload.taskId, status: "PENDING_APPROVAL" }, data: { status: "QUEUED" } });
        if (moved.count) {
          const task = await prisma.task.findUniqueOrThrow({ where: { id: payload.taskId } });
          if (task.projectId) await prisma.project.update({ where: { id: task.projectId }, data: { status: "ACTIVE" } });
          await enqueue("task.execute", { taskId: payload.taskId });
        }
      } else {
        await cancelTaskTree(payload.taskId);
      }
    }
    await emitActivity(approval.orgId, "approval.decided", `${approval.action}: ${input.decision.toLowerCase().replace("_", " ")}`, { approvalId: approval.id });
    await audit(approval.orgId, "user", user.id, `approval.${input.decision.toLowerCase()}`, approval.id, { note: input.note ?? null });
    return { ok: true };
  });

  /* ------------------------------------------------------ activity & stream */

  app.get<{ Params: { orgId: string }; Querystring: { after?: string } }>("/orgs/:orgId/activity", async (req) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id);
    const events = await prisma.activityEvent.findMany({
      where: { orgId: req.params.orgId, ...(req.query.after ? { id: { gt: Number(req.query.after) } } : {}) },
      orderBy: { id: "desc" },
      take: 100,
    });
    return { events };
  });

  app.get<{ Params: { orgId: string } }>("/orgs/:orgId/audit", async (req) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id, "ADMIN");
    const logs = await prisma.auditLog.findMany({ where: { orgId: req.params.orgId }, orderBy: { createdAt: "desc" }, take: 200 });
    return { logs };
  });

  /**
   * Server-sent events. EventSource cannot set headers, so the session token comes
   * as a query parameter; it is verified exactly like a bearer token.
   */
  app.get<{ Params: { orgId: string }; Querystring: { token?: string; after?: string } }>("/orgs/:orgId/stream", async (req, reply) => {
    const user = await verifyToken(req.query.token ?? "");
    await requireOrgRole(req.params.orgId, user.id);
    reply.hijack();
    const origin = req.headers.origin;
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    });
    let lastId = Number(req.query.after ?? 0);
    if (!lastId) {
      const latest = await prisma.activityEvent.findFirst({ where: { orgId: req.params.orgId }, orderBy: { id: "desc" }, select: { id: true } });
      lastId = latest?.id ?? 0;
    }
    let closed = false;
    req.raw.on("close", () => (closed = true));
    reply.raw.write(`event: ready\ndata: {}\n\n`);
    let ticks = 0;
    while (!closed) {
      const events = await prisma.activityEvent.findMany({ where: { orgId: req.params.orgId, id: { gt: lastId } }, orderBy: { id: "asc" }, take: 50 });
      for (const e of events) {
        lastId = e.id;
        reply.raw.write(`id: ${e.id}\nevent: activity\ndata: ${JSON.stringify(e)}\n\n`);
      }
      if (++ticks % 15 === 0) reply.raw.write(`: keepalive\n\n`);
      await new Promise((r) => setTimeout(r, 1500));
    }
    reply.raw.end();
  });

  /* -------------------------------------------------------------- overview */

  app.get<{ Params: { orgId: string } }>("/orgs/:orgId/overview", async (req) => {
    const user = await requireUser(req);
    await requireOrgRole(req.params.orgId, user.id);
    const orgId = req.params.orgId;
    const since = new Date(Date.now() - 30 * 86400_000);
    const [agents, taskGroups, pendingApprovals, salesOrders, purchaseOrders, receipts, costAgg, recentTasks, daily] = await Promise.all([
      prisma.agent.findMany({ where: { orgId }, select: { id: true, name: true, role: true, status: true, tasksCompleted: true, tasksFailed: true, costMicros: true } }),
      prisma.task.groupBy({ by: ["status"], where: { orgId }, _count: true }),
      prisma.approval.count({ where: { orgId, status: "PENDING" } }),
      prisma.serviceOrder.findMany({ where: { sellerOrgId: orgId }, select: { status: true, amountUnits: true, isTest: true } }),
      prisma.serviceOrder.findMany({ where: { buyerOrgId: orgId }, select: { status: true, amountUnits: true, feeUnits: true } }),
      prisma.paymentReceipt.findMany({ where: { order: { sellerOrgId: orgId } }, select: { amountUnits: true } }),
      prisma.agentExecution.aggregate({ where: { agent: { orgId } }, _sum: { costMicros: true } }),
      prisma.task.findMany({ where: { orgId }, orderBy: { updatedAt: "desc" }, take: 8, include: { agent: { select: { name: true } } } }),
      prisma.$queryRaw<{ day: Date; completed: bigint; failed: bigint; cost: bigint }[]>`
        SELECT date_trunc('day', "completedAt") AS day,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
          COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
          COALESCE(SUM("costMicros"), 0) AS cost
        FROM "Task" WHERE "orgId" = ${orgId} AND "completedAt" >= ${since}
        GROUP BY 1 ORDER BY 1`,
    ]);
    const count = (s: string) => taskGroups.find((g) => g.status === s)?._count ?? 0;
    const revenueUnits = receipts.reduce((s, r) => s + BigInt(r.amountUnits), 0n);
    const expensesUnits = purchaseOrders.filter((o) => o.status === "ACCEPTED").reduce((s, o) => s + BigInt(o.amountUnits) + BigInt(o.feeUnits), 0n);
    return {
      metrics: {
        activeAgents: agents.filter((a) => a.status !== "PAUSED").length,
        runningTasks: count("RUNNING") + count("QUEUED") + count("WAITING_ON_DEPENDENCY"),
        completedTasks: count("COMPLETED"),
        failedTasks: count("FAILED"),
        pendingApprovals,
        openSalesOrders: salesOrders.filter((o) => ["FUNDED", "IN_PROGRESS", "DELIVERED"].includes(o.status)).length,
        revenueUnits: revenueUnits.toString(),
        expensesUnits: expensesUnits.toString(),
        netUnits: (revenueUnits - expensesUnits).toString(),
        executionCostMicros: costAgg._sum.costMicros ?? 0,
      },
      agents,
      recentTasks,
      daily: daily.map((d) => ({ day: d.day, completed: Number(d.completed), failed: Number(d.failed), costMicros: Number(d.cost) })),
      tokenDecimals: env.SETTLEMENT_TOKEN_DECIMALS,
      tokenSymbol: env.SETTLEMENT_TOKEN_SYMBOL,
    };
  });
}
