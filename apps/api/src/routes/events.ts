import { events } from "@anytools/db";
import { eventsBatchRequestSchema, eventsBatchResponseSchema } from "@anytools/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { clientCountry } from "../lib/client-info.js";

/** Batched analytics ingestion. Also feeds the "most used" ranking from `tool_used` events. */
export const eventRoutes: FastifyPluginAsyncZod = async (app) => {
  const { env, db, clock } = app.deps;
  const { catalog, popularity } = app.services;

  app.post(
    "/events",
    {
      bodyLimit: 64 * 1024,
      config: { rateLimit: { max: env.RATE_LIMIT_EVENTS_PER_MINUTE, timeWindow: "1 minute" } },
      schema: { body: eventsBatchRequestSchema, response: { 202: eventsBatchResponseSchema } },
    },
    async (request, reply) => {
      const batch = request.body.events;
      const { visitorId } = request.actor;
      const slugs = [...new Set(batch.flatMap((e) => ("toolSlug" in e ? [e.toolSlug] : [])))];
      const toolIds = await catalog.toolIdsBySlug(slugs);
      const country = clientCountry(request, {
        trustCloudflareHeaders: env.TRUST_CLOUDFLARE_HEADERS,
      });
      const createdAt = clock.now();

      await db.insert(events).values(
        batch.map((event) => ({
          visitorId,
          type: event.type,
          toolId: "toolSlug" in event ? (toolIds.get(event.toolSlug) ?? null) : null,
          props: "props" in event && event.props ? { ...event.props } : {},
          country,
          createdAt,
        })),
      );

      for (const event of batch) {
        if (event.type === "tool_used" && toolIds.has(event.toolSlug)) {
          await popularity.recordUse(event.toolSlug, visitorId);
        }
      }
      return reply.code(202).send({ accepted: batch.length });
    },
  );
};
