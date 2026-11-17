import type { Prisma } from "@prisma/client";
import { prisma } from "./db.js";

/**
 * Activity events feed the realtime dashboard stream. They are persisted, so the
 * SSE stream works across API and worker processes. Never put prompts, secrets or
 * raw model inputs in an activity event.
 */
export async function emitActivity(orgId: string, type: string, summary: string, data?: Prisma.InputJsonValue) {
  await prisma.activityEvent.create({ data: { orgId, type, summary, data } });
}

export async function audit(
  orgId: string | null,
  actorType: "user" | "agent" | "system",
  actorId: string,
  action: string,
  target?: string,
  meta?: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({ data: { orgId, actorType, actorId, action, target, meta } });
}
