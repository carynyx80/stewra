import { env } from "./env.js";
import { buildApp } from "./app.js";
import { registerHandler, startWorker, stopWorker } from "./queue.js";
import { executeTask } from "./ai/engine.js";
import { runMaintenance } from "./maintenance.js";
import { prisma } from "./db.js";

registerHandler("task.execute", async (payload) => {
  await executeTask(String(payload.taskId));
});

const app = await buildApp();
await app.listen({ port: env.PORT, host: "0.0.0.0" });

// The API service is a long-lived process on Railway, so it can host the worker.
// Set WORKER_ENABLED=false and run `npm run start:worker` to split them.
if (env.WORKER_ENABLED) startWorker(env.WORKER_CONCURRENCY, runMaintenance);

const shutdown = async () => {
  stopWorker();
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
