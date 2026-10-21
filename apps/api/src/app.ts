import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyBaseLogger, LogController } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import type { Logger } from "pino";
import { clientIp } from "./lib/client-info.js";
import { HttpError } from "./lib/http-error.js";
import { registerErrorHandling } from "./plugins/errors.js";
import { registerVisitor } from "./plugins/visitor.js";
import { catalogRoutes } from "./routes/catalog.js";
import { eventRoutes } from "./routes/events.js";
import { fileRoutes } from "./routes/files.js";
import { healthRoutes } from "./routes/health.js";
import { jobRoutes } from "./routes/jobs.js";
import { toolRoutes } from "./routes/tools.js";
import { unlockRoutes } from "./routes/unlock.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { CatalogService } from "./services/catalog.js";
import { PopularityService } from "./services/popularity.js";
import { UnlockTokenService } from "./services/unlock-tokens.js";
import type { AppDeps } from "./types.js";
import "./types.js";

export interface BuildAppOptions {
  logger: Logger;
  /** Catalog cache TTL; tests use 0. */
  catalogCacheTtlMs?: number;
}

export async function buildApp(deps: AppDeps, options: BuildAppOptions) {
  const { env } = deps;
  const app = Fastify({
    loggerInstance: options.logger as FastifyBaseLogger,
    // A hop count means "trust the first N proxies" (same semantics as proxy-addr).
    trustProxy:
      typeof env.TRUST_PROXY === "number"
        ? (_address: string, hop: number) => hop < (env.TRUST_PROXY as number)
        : env.TRUST_PROXY,
    // Production skips per-request access lines (errors are still logged by the error handler).
    logController: new LogController({ disableRequestLogging: env.NODE_ENV === "production" }),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate("deps", deps);
  app.decorate("services", {
    catalog: new CatalogService(deps.db, {
      showDrafts: env.SHOW_DRAFT_TOOLS,
      cacheTtlMs: options.catalogCacheTtlMs ?? 30_000,
    }),
    tokens: new UnlockTokenService(env.UNLOCK_JWT_SECRET, deps.redis, deps.clock),
    popularity: new PopularityService(deps.redis, deps.clock),
  });

  registerErrorHandling(app);
  app.addHook("onSend", async (_request, reply) => {
    reply.header("x-content-type-options", "nosniff");
  });

  // Global per-IP limit with Redis as the shared store (works across API replicas).
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_GLOBAL_PER_MINUTE,
    timeWindow: "1 minute",
    redis: deps.redis,
    nameSpace: "ratelimit:",
    skipOnError: true,
    keyGenerator: (request) =>
      clientIp(request, { trustCloudflareHeaders: env.TRUST_CLOUDFLARE_HEADERS }),
    errorResponseBuilder: (_request, context) =>
      new HttpError(
        429,
        "rate_limited",
        `Too many requests, retry in ${Math.ceil(context.ttl / 1000)}s`,
      ),
  });

  await registerVisitor(app, { secret: env.COOKIE_SECRET, secure: env.COOKIE_SECURE });
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024, files: 10 } });

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(catalogRoutes);
      await api.register(unlockRoutes);
      await api.register(toolRoutes);
      await api.register(jobRoutes);
      await api.register(fileRoutes);
      await api.register(eventRoutes);
      await api.register(webhookRoutes);
    },
    { prefix: "/api" },
  );

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
