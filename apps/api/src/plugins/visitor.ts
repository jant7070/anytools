import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import { VISITOR_COOKIE_NAME } from "@anytools/shared";
import type { FastifyInstance } from "fastify";
import type { Actor } from "../types.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Chrome caps cookie lifetime at 400 days. */
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/**
 * Anonymous visitor identity: a random UUID in a signed, httpOnly, SameSite=Lax cookie.
 * Every request gets `request.actor`; a fresh id is issued when the cookie is missing or forged.
 */
export async function registerVisitor(
  app: FastifyInstance,
  options: { secret: string; secure: boolean },
) {
  await app.register(cookie, { secret: options.secret, hook: "onRequest" });
  // Fastify 5 forbids reference-type defaults on decorators; the hook below always assigns it.
  app.decorateRequest("actor", null as unknown as Actor);

  app.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions.config.visitor === false) return;

    const raw = request.cookies[VISITOR_COOKIE_NAME];
    const unsigned = raw ? request.unsignCookie(raw) : undefined;
    let visitorId =
      unsigned?.valid && unsigned.value && UUID.test(unsigned.value) ? unsigned.value : null;

    if (!visitorId || unsigned?.renew) {
      visitorId ??= randomUUID();
      reply.setCookie(VISITOR_COOKIE_NAME, visitorId, {
        signed: true,
        httpOnly: true,
        secure: options.secure,
        sameSite: "lax",
        path: "/",
        maxAge: MAX_AGE_SECONDS,
      });
    }
    request.actor = { visitorId, userId: null };
  });
}
