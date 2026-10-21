import { randomUUID } from "node:crypto";
import { unlockSessions } from "@anytools/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applixirSignature } from "../src/ads/applixir.js";
import {
  createTestContext,
  newVisitor,
  runPasswordGenerator,
  startUnlock,
  unlockStatus,
  type TestContext,
} from "./helpers.js";
import { APPLIXIR } from "./test-env.js";

function callbackUrl(
  userId: string,
  tid: string,
  overrides: { signature?: string; secret?: string } = {},
) {
  const base = { gameApiKey: APPLIXIR.apiKey, gameId: APPLIXIR.gameId, userId, tid };
  const signature =
    overrides.signature ?? applixirSignature(base, overrides.secret ?? APPLIXIR.secret);
  // AppLixir also sends the raw secret as `secretKey`; include it to prove it is never logged.
  const params = new URLSearchParams({ ...base, signature, secretKey: APPLIXIR.secret });
  return `/api/webhooks/ads/applixir?${params.toString()}`;
}

describe("AppLixir webhook", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext({ env: { AD_PROVIDER: "applixir", LOG_LEVEL: "trace" } });
  });
  beforeEach(() => ctx.reset());
  afterAll(() => ctx.close());

  async function sessionStatus(id: string) {
    const [row] = await ctx.db.select().from(unlockSessions).where(eq(unlockSessions.id, id));
    return row;
  }

  it("verifies the session on a valid signature and then issues a token", async () => {
    const cookies = await newVisitor(ctx.app);
    const { sessionId, ad } = await startUnlock(ctx, cookies, "password-generator");
    expect(ad.provider).toBe("applixir");
    expect((await unlockStatus(ctx, cookies, sessionId)).body.status).toBe("pending");

    const res = await ctx.app.inject({ method: "GET", url: callbackUrl(sessionId, "tid-1") });
    expect(res.statusCode).toBe(200);
    const row = await sessionStatus(sessionId);
    expect(row?.status).toBe("verified");
    expect(row?.providerTxId).toBe("tid-1");

    const { body } = await unlockStatus(ctx, cookies, sessionId);
    expect(body.status).toBe("verified");
    if (body.status !== "verified") return;
    expect((await runPasswordGenerator(ctx, cookies, body.token)).statusCode).toBe(200);
  });

  it("rejects an invalid signature and leaves the session pending", async () => {
    const cookies = await newVisitor(ctx.app);
    const { sessionId } = await startUnlock(ctx, cookies, "password-generator");

    const wrongSecret = await ctx.app.inject({
      method: "GET",
      url: callbackUrl(sessionId, "tid-2", { secret: "nope" }),
    });
    expect(wrongSecret.statusCode).toBe(403);
    const garbage = await ctx.app.inject({
      method: "GET",
      url: callbackUrl(sessionId, "tid-2", { signature: "0".repeat(32) }),
    });
    expect(garbage.statusCode).toBe(403);

    expect((await sessionStatus(sessionId))?.status).toBe("pending");
    expect((await unlockStatus(ctx, cookies, sessionId)).body.status).toBe("pending");
  });

  it("treats a duplicate tid as a no-op 200", async () => {
    const cookies = await newVisitor(ctx.app);
    const first = await startUnlock(ctx, cookies, "password-generator");
    const second = await startUnlock(ctx, cookies, "password-generator");

    expect(
      (await ctx.app.inject({ method: "GET", url: callbackUrl(first.sessionId, "tid-dup") }))
        .statusCode,
    ).toBe(200);
    // Same delivery retried: still 200, nothing changes.
    expect(
      (await ctx.app.inject({ method: "GET", url: callbackUrl(first.sessionId, "tid-dup") }))
        .statusCode,
    ).toBe(200);
    // The same tid replayed against another session must not unlock it.
    expect(
      (await ctx.app.inject({ method: "GET", url: callbackUrl(second.sessionId, "tid-dup") }))
        .statusCode,
    ).toBe(200);

    expect((await sessionStatus(first.sessionId))?.status).toBe("verified");
    expect((await sessionStatus(second.sessionId))?.status).toBe("pending");
  });

  it("ignores unknown sessions without failing the delivery", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: callbackUrl(randomUUID(), "tid-unknown"),
    });
    expect(res.statusCode).toBe(200);
  });

  it("never logs the query string (it carries the secret in plain text)", async () => {
    const cookies = await newVisitor(ctx.app);
    const { sessionId } = await startUnlock(ctx, cookies, "password-generator");
    await ctx.app.inject({ method: "GET", url: callbackUrl(sessionId, "tid-log") });
    await ctx.app.inject({
      method: "GET",
      url: callbackUrl(sessionId, "tid-log2", { secret: "bad" }),
    });

    const output = ctx.logs.join("\n");
    expect(output).toContain("/api/webhooks/ads/applixir");
    expect(output).not.toContain(APPLIXIR.secret);
    expect(output).not.toContain("signature=");
    expect(output).not.toContain("tid-log");
  });
});
