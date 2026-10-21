import { UNLOCK_TOKEN_TTL_SECONDS } from "@anytools/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestContext,
  newVisitor,
  obtainToken,
  runPasswordGenerator,
  startUnlock,
  unlockStatus,
  type TestContext,
} from "./helpers.js";

/**
 * Mandatory bypass tests: every attempt to run a tool without a legitimate, current unlock for
 * that same tool must fail. The positive control proves the happy path still works.
 */
describe("unlock bypass protection", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    // Monetag-style verification: 20 s minimum, measured on the server.
    ctx = await createTestContext({
      env: {
        AD_PROVIDER: "monetag",
        MONETAG_ZONE_ID: "123",
        MONETAG_SDK_URL: "https://ads.example.com/sdk.js",
      },
    });
  });
  beforeEach(() => ctx.reset());
  afterAll(() => ctx.close());

  const MIN_WAIT_MS = 20_000;

  it("positive control: a verified unlock allows running the tool", async () => {
    const cookies = await newVisitor(ctx.app);
    const { token } = await obtainToken(ctx, cookies, "password-generator", MIN_WAIT_MS);
    const res = await runPasswordGenerator(ctx, cookies, token);
    expect(res.statusCode).toBe(200);
    expect(res.json().result.passwords[0]).toHaveLength(20);
  });

  it("1. rejects running a tool without a token", async () => {
    const cookies = await newVisitor(ctx.app);
    const res = await runPasswordGenerator(ctx, cookies);
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("unlock_required");

    const forged = await runPasswordGenerator(ctx, cookies, "not.a.jwt");
    expect(forged.statusCode).toBe(401);
  });

  it("2. rejects an expired token (after the 5-minute window)", async () => {
    const cookies = await newVisitor(ctx.app);
    const { token, sessionId } = await obtainToken(ctx, cookies, "password-generator", MIN_WAIT_MS);
    expect((await runPasswordGenerator(ctx, cookies, token)).statusCode).toBe(200);

    ctx.clock.advance(UNLOCK_TOKEN_TTL_SECONDS * 1000 + 1000);
    const res = await runPasswordGenerator(ctx, cookies, token);
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("unlock_token_expired");

    // Polling the old session again must not mint a fresh token.
    const { body } = await unlockStatus(ctx, cookies, sessionId);
    expect(body.status).toBe("expired");
  });

  it("3. rejects a token issued for a different tool", async () => {
    const cookies = await newVisitor(ctx.app);
    const { token } = await obtainToken(ctx, cookies, "pixelate-image", MIN_WAIT_MS);
    const res = await runPasswordGenerator(ctx, cookies, token);
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("unlock_token_tool_mismatch");
  });

  it("4. does not issue a token before the minimum ad time has elapsed", async () => {
    const cookies = await newVisitor(ctx.app);
    const { sessionId } = await startUnlock(ctx, cookies, "password-generator");

    ctx.clock.advance(MIN_WAIT_MS - 1000);
    const early = await unlockStatus(ctx, cookies, sessionId);
    expect(early.statusCode).toBe(200);
    expect(early.body.status).toBe("pending");
    expect(early.body).not.toHaveProperty("token");
    expect((await runPasswordGenerator(ctx, cookies)).statusCode).toBe(401);

    ctx.clock.advance(1000);
    const onTime = await unlockStatus(ctx, cookies, sessionId);
    expect(onTime.body.status).toBe("verified");
  });

  it("rejects a token stolen by another visitor", async () => {
    const owner = await newVisitor(ctx.app);
    const thief = await newVisitor(ctx.app);
    const { token, sessionId } = await obtainToken(ctx, owner, "password-generator", MIN_WAIT_MS);
    expect((await runPasswordGenerator(ctx, thief, token)).statusCode).toBe(401);
    // The thief cannot read the owner's session either.
    expect((await unlockStatus(ctx, thief, sessionId)).statusCode).toBe(404);
  });

  it("allows several runs within the window but caps runs per minute", async () => {
    const cookies = await newVisitor(ctx.app);
    const { token } = await obtainToken(ctx, cookies, "password-generator", MIN_WAIT_MS);
    for (let i = 0; i < 3; i++)
      expect((await runPasswordGenerator(ctx, cookies, token)).statusCode).toBe(200);
    const limited = await runPasswordGenerator(ctx, cookies, token);
    expect(limited.statusCode).toBe(429);

    ctx.clock.advance(60_000);
    expect((await runPasswordGenerator(ctx, cookies, token)).statusCode).toBe(200);
  });

  it("rejects revoked tokens", async () => {
    const cookies = await newVisitor(ctx.app);
    const { token, sessionId } = await obtainToken(ctx, cookies, "password-generator", MIN_WAIT_MS);
    await ctx.app.services.tokens.revoke(sessionId);
    expect((await runPasswordGenerator(ctx, cookies, token)).statusCode).toBe(401);
    expect((await unlockStatus(ctx, cookies, sessionId)).body.status).toBe("expired");
  });

  it("rejects a forged visitor cookie (a new anonymous identity is issued instead)", async () => {
    const cookies = await newVisitor(ctx.app);
    const { token } = await obtainToken(ctx, cookies, "password-generator", MIN_WAIT_MS);
    const tampered = { at_vid: `${cookies.at_vid!.split(".")[0]}.forgedsignature` };
    expect((await runPasswordGenerator(ctx, tampered, token)).statusCode).toBe(401);
  });
});
