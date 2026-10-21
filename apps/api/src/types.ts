import type { Database } from "@anytools/db";
import type { ToolJobData, ToolJobResult } from "@anytools/shared";
import type { ToolRegistry } from "@anytools/tools";
import type { StorageProvider } from "@anytools/tools/storage";
import type { Queue } from "bullmq";
import type { Redis } from "ioredis";
import type { AdProvider } from "./ads/index.js";
import type { Env } from "./env.js";
import type { Clock } from "./lib/clock.js";
import type { CatalogService } from "./services/catalog.js";
import type { PopularityService } from "./services/popularity.js";
import type { TurnstileVerifier } from "./services/turnstile.js";
import type { UnlockTokenService } from "./services/unlock-tokens.js";

export type ToolQueue = Queue<ToolJobData, ToolJobResult>;

/** External dependencies, injected so tests can swap Turnstile, the ad provider or the clock. */
export interface AppDeps {
  env: Env;
  db: Database;
  redis: Redis;
  toolQueue: ToolQueue;
  storage: StorageProvider;
  turnstile: TurnstileVerifier;
  adProvider: AdProvider;
  clock: Clock;
  registry: ToolRegistry;
}

export interface AppServices {
  catalog: CatalogService;
  tokens: UnlockTokenService;
  popularity: PopularityService;
}

/**
 * Who is making the request. Only anonymous visitors exist today; `userId` is the seam for
 * future accounts (ad-free subscriptions) without changing route code.
 */
export interface Actor {
  visitorId: string;
  userId: string | null;
}

declare module "fastify" {
  interface FastifyInstance {
    deps: AppDeps;
    services: AppServices;
  }
  interface FastifyRequest {
    actor: Actor;
  }
  interface FastifyContextConfig {
    /** Set to false on server-to-server routes (webhooks) that must not get a visitor cookie. */
    visitor?: boolean;
  }
}
