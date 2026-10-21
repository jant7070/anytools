import { tools, unlockSessions, type UnlockSession } from "@anytools/db";
import {
  UNLOCK_SESSION_PENDING_TTL_SECONDS,
  unlockStartRequestSchema,
  unlockStartResponseSchema,
  unlockStatusParamsSchema,
  unlockStatusResponseSchema,
  type UnlockStatusResponse,
} from "@anytools/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { clientCountry, clientIp, hashIp } from "../lib/client-info.js";
import { HttpError, notFound } from "../lib/http-error.js";

const POLL_INTERVAL_MS = 1000;

export const unlockRoutes: FastifyPluginAsyncZod = async (app) => {
  const { env, db, redis, turnstile, adProvider, clock, registry } = app.deps;
  const { catalog, tokens } = app.services;
  const cf = { trustCloudflareHeaders: env.TRUST_CLOUDFLARE_HEADERS };

  /** Starts an unlock: Turnstile + rate limit, then a `pending` session for the active ad provider. */
  app.post(
    "/unlock/start",
    {
      config: {
        rateLimit: { max: env.RATE_LIMIT_UNLOCK_START_PER_MINUTE, timeWindow: "1 minute" },
      },
      schema: { body: unlockStartRequestSchema, response: { 200: unlockStartResponseSchema } },
    },
    async (request) => {
      const { toolSlug, turnstileToken } = request.body;
      const tool = await catalog.findVisibleTool(toolSlug);
      if (!tool || !registry.has(toolSlug)) throw notFound("Tool not available");

      const ip = clientIp(request, cf);
      if (!(await turnstile.verify(turnstileToken, ip))) {
        throw new HttpError(403, "turnstile_failed", "Human verification failed, please retry");
      }

      // Soft daily cap per IP: time-based providers cannot prove an ad was shown, so bound abuse.
      const ipHash = hashIp(ip, env.IP_HASH_SALT);
      const dailyKey = `unlock:daily:${ipHash}:${clock.now().toISOString().slice(0, 10)}`;
      const [[, todayCount]] = (await redis
        .multi()
        .incr(dailyKey)
        .expire(dailyKey, 86_400 * 2)
        .exec()) as [[Error | null, number]];
      if (todayCount > env.UNLOCK_MAX_PER_IP_PER_DAY) {
        throw new HttpError(429, "rate_limited", "Daily unlock limit reached, try again tomorrow");
      }

      const [session] = await db
        .insert(unlockSessions)
        .values({
          toolId: tool.id,
          visitorId: request.actor.visitorId,
          adProvider: adProvider.name,
          ipHash,
          country: clientCountry(request, cf),
          createdAt: clock.now(),
        })
        .returning();
      if (!session) throw new Error("Failed to create unlock session");

      return {
        sessionId: session.id,
        ad: adProvider.clientConfig(session),
        pollIntervalMs: POLL_INTERVAL_MS,
        expiresAt: new Date(
          session.createdAt.getTime() + UNLOCK_SESSION_PENDING_TTL_SECONDS * 1000,
        ).toISOString(),
      };
    },
  );

  async function markExpired(session: UnlockSession): Promise<UnlockStatusResponse> {
    await db
      .update(unlockSessions)
      .set({ status: "expired" })
      .where(eq(unlockSessions.id, session.id));
    return { status: "expired" };
  }

  /**
   * Polled by the client after the ad. The server decides: only when the provider verifies the
   * session is a 5-minute JWT for that single tool issued.
   */
  app.get(
    "/unlock/:id/status",
    { schema: { params: unlockStatusParamsSchema, response: { 200: unlockStatusResponseSchema } } },
    async (request): Promise<UnlockStatusResponse> => {
      const [row] = await db
        .select({ session: unlockSessions, toolSlug: tools.slug })
        .from(unlockSessions)
        .innerJoin(tools, eq(tools.id, unlockSessions.toolId))
        .where(
          and(
            eq(unlockSessions.id, request.params.id),
            eq(unlockSessions.visitorId, request.actor.visitorId),
          ),
        )
        .limit(1);
      if (!row) throw new HttpError(404, "unlock_session_not_found", "Unlock session not found");

      let { session } = row;
      const now = clock.now();
      if (session.status === "expired") return { status: "expired" };

      if (session.status === "pending") {
        if (
          now.getTime() - session.createdAt.getTime() >
          UNLOCK_SESSION_PENDING_TTL_SECONDS * 1000
        ) {
          return markExpired(session);
        }
        const verification = adProvider.checkVerification(session, now);
        if (!verification.verified)
          return { status: "pending", retryAfterMs: verification.retryAfterMs };

        // Time-based providers verify here; the conditional update makes concurrent polls safe.
        const [updated] = await db
          .update(unlockSessions)
          .set({ status: "verified", verifiedAt: now })
          .where(and(eq(unlockSessions.id, session.id), eq(unlockSessions.status, "pending")))
          .returning();
        if (updated) session = updated;
        else {
          const [current] = await db
            .select()
            .from(unlockSessions)
            .where(eq(unlockSessions.id, session.id));
          if (!current || current.status !== "verified")
            return { status: "pending", retryAfterMs: POLL_INTERVAL_MS };
          session = current;
        }
      }

      const issued = await tokens.issue({
        sessionId: session.id,
        toolSlug: row.toolSlug,
        visitorId: session.visitorId,
        verifiedAt: session.verifiedAt ?? now,
      });
      if (!issued) return markExpired(session);
      return {
        status: "verified",
        token: issued.token,
        toolSlug: row.toolSlug,
        expiresAt: issued.expiresAt.toISOString(),
        expiresInMs: Math.max(0, issued.expiresAt.getTime() - now.getTime()),
      };
    },
  );
};
