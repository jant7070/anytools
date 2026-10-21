import { createDb, events, unlockSessions } from "@anytools/db";
import {
  TOOL_QUEUE_NAME,
  VISITOR_COOKIE_NAME,
  type ToolJobData,
  type ToolJobResult,
  type UnlockStatusResponse,
} from "@anytools/shared";
import { toolRegistry } from "@anytools/tools";
import { createStorageProvider, storageConfigFromEnv } from "@anytools/tools/storage";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { buildApp, type App } from "../src/app.js";
import { createAdProvider, type AdProvider } from "../src/ads/index.js";
import { loadEnv, type Env } from "../src/env.js";
import type { Clock } from "../src/lib/clock.js";
import { createLogger } from "../src/logger.js";
import type { TurnstileVerifier } from "../src/services/turnstile.js";
import { BASE_TEST_ENV } from "./test-env.js";

export class TestClock implements Clock {
  private current = Date.now();
  now() {
    return new Date(this.current);
  }
  advance(ms: number) {
    this.current += ms;
  }
}

export const VALID_TURNSTILE = "valid-turnstile-token";

/** Accepts only VALID_TURNSTILE, so tests can exercise both outcomes without network access. */
export const fakeTurnstile: TurnstileVerifier = {
  verify: async (token) => token === VALID_TURNSTILE,
};

export interface TestContext {
  app: App;
  env: Env;
  clock: TestClock;
  db: ReturnType<typeof createDb>["db"];
  redis: Redis;
  queue: Queue<ToolJobData, ToolJobResult>;
  /** Raw log lines written by the app. */
  logs: string[];
  reset(): Promise<void>;
  close(): Promise<void>;
}

export async function createTestContext(
  options: { env?: Record<string, string>; adProvider?: (env: Env) => AdProvider } = {},
): Promise<TestContext> {
  const env = loadEnv({ ...BASE_TEST_ENV, ...options.env });
  const logs: string[] = [];
  const logger = createLogger(env, { write: (line: string) => void logs.push(line) });
  const dbHandle = createDb(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX });
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
  const queueConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const queue: Queue<ToolJobData, ToolJobResult> = new Queue(TOOL_QUEUE_NAME, {
    connection: queueConnection,
    prefix: "anytools-test",
  });
  const clock = new TestClock();

  const app = await buildApp(
    {
      env,
      db: dbHandle.db,
      redis,
      toolQueue: queue,
      storage: createStorageProvider(storageConfigFromEnv(env)),
      turnstile: fakeTurnstile,
      adProvider: (options.adProvider ?? createAdProvider)(env),
      clock,
      registry: toolRegistry,
    },
    { logger, catalogCacheTtlMs: 0 },
  );
  await app.ready();

  return {
    app,
    env,
    clock,
    db: dbHandle.db,
    redis,
    queue,
    logs,
    async reset() {
      await dbHandle.db.delete(unlockSessions);
      await dbHandle.db.delete(events);
      await redis.flushdb();
      logs.length = 0;
    },
    async close() {
      await app.close();
      await queue.close();
      queueConnection.disconnect();
      redis.disconnect();
      await dbHandle.close();
    },
  };
}

export type Cookies = Record<string, string>;

/** Makes a first request to obtain a signed visitor cookie. */
export async function newVisitor(app: App): Promise<Cookies> {
  const res = await app.inject({ method: "GET", url: "/api/catalog/tools?locale=es" });
  const cookie = res.cookies.find((c) => c.name === VISITOR_COOKIE_NAME);
  if (!cookie) throw new Error("visitor cookie was not set");
  return { [VISITOR_COOKIE_NAME]: cookie.value };
}

export async function startUnlock(ctx: TestContext, cookies: Cookies, toolSlug: string) {
  const res = await ctx.app.inject({
    method: "POST",
    url: "/api/unlock/start",
    cookies,
    payload: { toolSlug, turnstileToken: VALID_TURNSTILE },
  });
  if (res.statusCode !== 200) throw new Error(`unlock/start failed: ${res.statusCode} ${res.body}`);
  return res.json<{ sessionId: string; ad: { provider: string } }>();
}

export async function unlockStatus(ctx: TestContext, cookies: Cookies, sessionId: string) {
  const res = await ctx.app.inject({
    method: "GET",
    url: `/api/unlock/${sessionId}/status`,
    cookies,
  });
  return { statusCode: res.statusCode, body: res.json<UnlockStatusResponse>() };
}

/** Full happy path with a time-based provider: start, wait the minimum time, get the token. */
export async function obtainToken(
  ctx: TestContext,
  cookies: Cookies,
  toolSlug: string,
  waitMs: number,
) {
  const { sessionId } = await startUnlock(ctx, cookies, toolSlug);
  ctx.clock.advance(waitMs);
  const { body } = await unlockStatus(ctx, cookies, sessionId);
  if (body.status !== "verified") throw new Error(`expected verified, got ${body.status}`);
  return { token: body.token, sessionId };
}

export function runPasswordGenerator(ctx: TestContext, cookies: Cookies, token?: string) {
  return ctx.app.inject({
    method: "POST",
    url: "/api/tools/password-generator/run",
    cookies,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload: { length: 20 },
  });
}
