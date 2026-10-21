import { sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  const routeConfig = { visitor: false, rateLimit: false } as const;

  /** Liveness: the process is up. Used by Docker healthchecks. */
  app.get(
    "/health",
    { config: routeConfig, schema: { response: { 200: z.object({ status: z.literal("ok") }) } } },
    async () => ({
      status: "ok" as const,
    }),
  );

  /** Readiness: Postgres and Redis respond. */
  app.get("/health/ready", { config: routeConfig }, async (request, reply) => {
    try {
      await Promise.all([app.deps.db.execute(sql`select 1`), app.deps.redis.ping()]);
      return { status: "ready" };
    } catch (err) {
      request.log.error({ err }, "readiness check failed");
      return reply.code(503).send({ status: "unavailable" });
    }
  });
};
