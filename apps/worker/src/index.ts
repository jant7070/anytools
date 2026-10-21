import { createServer } from "node:http";
import { createDb } from "@anytools/db";
import {
  MAINTENANCE_QUEUE_NAME,
  TOOL_QUEUE_NAME,
  type ToolJobData,
  type ToolJobResult,
} from "@anytools/shared";
import { toolRegistry } from "@anytools/tools";
import { createStorageProvider, storageConfigFromEnv } from "@anytools/tools/storage";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { EnvError, loadEnv } from "./env.js";
import { createLogger } from "./logger.js";
import { runMaintenance } from "./maintenance.js";
import { createToolProcessor } from "./processor.js";

async function main() {
  const env = loadEnv();
  const logger = createLogger(env);
  const { db, close: closeDb } = createDb(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX });
  const storage = createStorageProvider(storageConfigFromEnv(env));
  // BullMQ workers require maxRetriesPerRequest: null.
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  connection.on("error", (err) => logger.error({ err }, "redis error"));

  const toolWorker = new Worker<ToolJobData, ToolJobResult>(
    TOOL_QUEUE_NAME,
    createToolProcessor({ registry: toolRegistry, storage, logger }),
    { connection, concurrency: env.WORKER_CONCURRENCY },
  );
  toolWorker.on("failed", (job, err) =>
    logger.warn(
      { jobId: job?.id, tool: job?.data.toolSlug, reason: err.message },
      "tool job failed",
    ),
  );
  toolWorker.on("error", (err) => logger.error({ err }, "tool worker error"));

  // Periodic cleanup. The scheduler is idempotent, so every replica can upsert it safely.
  const maintenanceQueue = new Queue(MAINTENANCE_QUEUE_NAME, { connection });
  await maintenanceQueue.upsertJobScheduler(
    "cleanup",
    { every: env.CLEANUP_EVERY_SECONDS * 1000 },
    { name: "cleanup", opts: { removeOnComplete: { count: 10 }, removeOnFail: { count: 50 } } },
  );
  const maintenanceWorker = new Worker(
    MAINTENANCE_QUEUE_NAME,
    async () => {
      const result = await runMaintenance({ db, storage });
      logger.info(result, "maintenance completed");
      return result;
    },
    { connection, concurrency: 1 },
  );
  maintenanceWorker.on("error", (err) => logger.error({ err }, "maintenance worker error"));

  // Minimal health endpoint for container healthchecks.
  const health = createServer((req, res) => {
    const ok = req.url === "/health" && toolWorker.isRunning() && connection.status === "ready";
    res
      .writeHead(ok ? 200 : 503, { "content-type": "application/json" })
      .end(JSON.stringify({ status: ok ? "ok" : "unavailable" }));
  }).listen(env.WORKER_HEALTH_PORT);

  logger.info(
    {
      concurrency: env.WORKER_CONCURRENCY,
      tools: toolRegistry
        .list()
        .filter((t) => t.runMode === "queue")
        .map((t) => t.slug),
    },
    "worker ready",
  );

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down (finishing active jobs)");
    try {
      health.close();
      await Promise.all([toolWorker.close(), maintenanceWorker.close()]);
      await maintenanceQueue.close();
      connection.disconnect();
      await closeDb();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "error during shutdown");
      process.exit(1);
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  console.error(error instanceof EnvError ? error.message : error);
  process.exit(1);
});
