import { unlockSessions } from "@anytools/db";
import { UNLOCK_SESSION_PENDING_TTL_SECONDS } from "@anytools/shared";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { verifyApplixirSignature } from "../ads/applixir.js";
import { HttpError, notFound } from "../lib/http-error.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** postgres.js reports unique violations as SQLSTATE 23505 (drizzle may wrap it in `cause`). */
function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | undefined;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

// Documented AppLixir callback ("MD5 and TID" mode). `secretKey` (the raw secret, sent by
// AppLixir in plain text) and `customData` are accepted but never used or logged.
const applixirQuerySchema = z.object({
  gameApiKey: z.string().min(1).max(200),
  gameId: z.string().min(1).max(200),
  userId: z.string().max(100).default(""),
  tid: z.string().min(1).max(128),
  signature: z.string().regex(/^[0-9a-fA-F]{32}$/),
  secretKey: z.string().optional(),
  customData: z.string().optional(),
});

export const webhookRoutes: FastifyPluginAsyncZod = async (app) => {
  const { env, db, clock } = app.deps;

  /**
   * AppLixir server-to-server reward callback. NEVER log this request's query string: it contains
   * the shared secret in plain text (the logger strips query strings from every URL).
   * Delivery is at-least-once, so duplicates (same `tid`) are acknowledged with 200 and ignored.
   */
  app.get(
    "/webhooks/ads/applixir",
    { config: { visitor: false, rateLimit: false }, schema: { querystring: applixirQuerySchema } },
    async (request, reply) => {
      if (!env.APPLIXIR_SECRET) throw notFound();
      const q = request.query;

      if (q.gameApiKey !== env.APPLIXIR_API_KEY || q.gameId !== env.APPLIXIR_GAME_ID) {
        throw new HttpError(403, "bad_request", "Forbidden");
      }
      if (!verifyApplixirSignature(q, env.APPLIXIR_SECRET)) {
        request.log.warn("applixir callback with invalid signature");
        throw new HttpError(403, "bad_request", "Forbidden");
      }
      if (!UUID.test(q.userId)) {
        request.log.warn("applixir callback without a valid unlock session id");
        return reply.code(200).send({ ok: true });
      }

      const now = clock.now();
      try {
        const [updated] = await db
          .update(unlockSessions)
          .set({ status: "verified", verifiedAt: now, providerTxId: q.tid })
          .where(
            and(
              eq(unlockSessions.id, q.userId),
              eq(unlockSessions.status, "pending"),
              eq(unlockSessions.adProvider, "applixir"),
              isNull(unlockSessions.providerTxId),
              gt(
                unlockSessions.createdAt,
                new Date(now.getTime() - UNLOCK_SESSION_PENDING_TTL_SECONDS * 1000),
              ),
            ),
          )
          .returning({ id: unlockSessions.id });
        request.log.info(
          { sessionId: q.userId, verified: Boolean(updated) },
          "applixir callback processed",
        );
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        request.log.info({ sessionId: q.userId }, "applixir duplicate transaction ignored");
      }
      return reply.code(200).send({ ok: true });
    },
  );
};
