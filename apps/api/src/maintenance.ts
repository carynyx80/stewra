import { prisma } from "./db.js";
import { cancelTaskTree } from "./ai/engine.js";

/** Periodic housekeeping run by the worker: expire stale approvals and quotes. */
export async function runMaintenance() {
  const now = new Date();
  const expired = await prisma.approval.findMany({ where: { status: "PENDING", expiresAt: { lt: now } } });
  for (const a of expired) {
    await prisma.approval.update({ where: { id: a.id }, data: { status: "EXPIRED" } });
    const payload = (a.payload ?? {}) as { kind?: string; taskId?: string };
    if (payload.kind === "run_task" && payload.taskId) await cancelTaskTree(payload.taskId);
  }
  await prisma.serviceQuote.updateMany({ where: { status: "OPEN", expiresAt: { lt: now } }, data: { status: "EXPIRED" } });
}
