import { randomUUID } from "node:crypto";
import type { Job, Prisma } from "@prisma/client";
import { prisma } from "./db.js";

/**
 * Durable Postgres-backed job queue. Jobs survive restarts, are claimed with
 * FOR UPDATE SKIP LOCKED (safe with many workers), retried with backoff, and
 * reclaimed if a worker dies mid-job.
 */

export type JobType = "task.execute";
type Handler = (payload: Record<string, unknown>, job: Job) => Promise<void>;

export class PermanentJobError extends Error {}

const handlers = new Map<JobType, Handler>();
export const registerHandler = (type: JobType, handler: Handler) => handlers.set(type, handler);

export async function enqueue(type: JobType, payload: Prisma.InputJsonValue, runAt = new Date()) {
  return prisma.job.create({ data: { type, payload, runAt } });
}

const workerId = `worker-${randomUUID().slice(0, 8)}`;
const MAX_JOB_ATTEMPTS = 3;
const STALE_LOCK_MINUTES = 20;

async function claim(): Promise<Job | null> {
  const rows = await prisma.$queryRaw<Job[]>`
    UPDATE "Job" SET status = 'RUNNING', "lockedAt" = now(), "lockedBy" = ${workerId},
      attempts = attempts + 1, "updatedAt" = now()
    WHERE id = (
      SELECT id FROM "Job" WHERE status = 'QUEUED' AND "runAt" <= now()
      ORDER BY "runAt" ASC LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    RETURNING *`;
  return rows[0] ?? null;
}

async function process(job: Job) {
  const handler = handlers.get(job.type as JobType);
  try {
    if (!handler) throw new PermanentJobError(`No handler for job type ${job.type}`);
    await handler(job.payload as Record<string, unknown>, job);
    await prisma.job.update({ where: { id: job.id }, data: { status: "DONE", lockedAt: null, lockedBy: null } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const permanent = err instanceof PermanentJobError || job.attempts >= MAX_JOB_ATTEMPTS;
    await prisma.job.update({
      where: { id: job.id },
      data: permanent
        ? { status: "FAILED", lastError: message, lockedAt: null, lockedBy: null }
        : {
            status: "QUEUED",
            lastError: message,
            lockedAt: null,
            lockedBy: null,
            runAt: new Date(Date.now() + 2 ** job.attempts * 5000),
          },
    });
  }
}

async function recoverStale() {
  await prisma.job.updateMany({
    where: { status: "RUNNING", lockedAt: { lt: new Date(Date.now() - STALE_LOCK_MINUTES * 60_000) } },
    data: { status: "QUEUED", lockedAt: null, lockedBy: null },
  });
}

let running = false;

export function startWorker(concurrency: number, onTick?: () => Promise<void>) {
  if (running) return;
  running = true;
  let active = 0;
  let lastMaintenance = 0;

  const loop = async () => {
    while (running) {
      try {
        if (Date.now() - lastMaintenance > 60_000) {
          lastMaintenance = Date.now();
          await recoverStale();
          await onTick?.();
        }
        if (active < concurrency) {
          const job = await claim();
          if (job) {
            active++;
            process(job).finally(() => active--);
            continue;
          }
        }
      } catch (err) {
        console.error("[worker] loop error", err);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  };
  void loop();
  console.log(`[worker] ${workerId} started (concurrency ${concurrency})`);
}

export function stopWorker() {
  running = false;
}
