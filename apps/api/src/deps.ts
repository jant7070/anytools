import { createDb } from "@anytools/db";
import { TOOL_QUEUE_NAME } from "@anytools/shared";
import { toolRegistry } from "@anytools/tools";
import { createStorageProvider, storageConfigFromEnv } from "@anytools/tools/storage";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import type { Logger } from "pino";
import { createAdProvider } from "./ads/index.js";
import type { Env } from "./env.js";
import { systemClock } from "./lib/clock.js";
import { createTurnstileVerifier } from "./services/turnstile.js";
import type { AppDeps, ToolQueue } from "./types.js";

export interface RuntimeDeps extends AppDeps {
  close(): Promise<void>;
}

/** Wires real infrastructure from the validated environment. */
export function createDeps(env: Env, logger: Logger): RuntimeDeps {
  const { db, close: closeDb } = createDb(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX });
  // Fail fast on Redis hiccups for request-path commands (rate limit, unlock tokens).
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, connectTimeout: 5000 });
  redis.on("error", (err) => logger.error({ err }, "redis error"));
  // BullMQ requires maxRetriesPerRequest: null on its own connection.
  const queueConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  queueConnection.on("error", (err) => logger.error({ err }, "redis (queue) error"));
  const toolQueue: ToolQueue = new Queue(TOOL_QUEUE_NAME, { connection: queueConnection });

  return {
    env,
    db,
    redis,
    toolQueue,
    storage: createStorageProvider(storageConfigFromEnv(env)),
    turnstile: createTurnstileVerifier(env.TURNSTILE_SECRET_KEY, {
      onError: (err) => logger.warn({ err }, "turnstile verification request failed"),
    }),
    adProvider: createAdProvider(env),
    clock: systemClock,
    registry: toolRegistry,
    async close() {
      await toolQueue.close();
      queueConnection.disconnect();
      redis.disconnect();
      await closeDb();
    },
  };
}
