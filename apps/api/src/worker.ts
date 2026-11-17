import { env } from "./env.js";
import { registerHandler, startWorker, stopWorker } from "./queue.js";
import { executeTask } from "./ai/engine.js";
import { runMaintenance } from "./maintenance.js";

registerHandler("task.execute", async (payload) => {
  await executeTask(String(payload.taskId));
});
startWorker(env.WORKER_CONCURRENCY, runMaintenance);
process.on("SIGTERM", () => {
  stopWorker();
  setTimeout(() => process.exit(0), 5000);
});
