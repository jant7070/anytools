import { UNLOCK_TOKEN_TTL_SECONDS } from "@anytools/shared";
import type { Redis } from "ioredis";
import { errors as joseErrors, jwtVerify, SignJWT } from "jose";
import type { Clock } from "../lib/clock.js";
import { HttpError } from "../lib/http-error.js";

const ISSUER = "anytools-api";
const AUDIENCE = "anytools-tool-run";
const ALG = "HS256";

export interface UnlockTokenClaims {
  toolSlug: string;
  visitorId: string;
  sessionId: string;
  jti: string;
}

export interface IssuedToken {
  token: string;
  expiresAt: Date;
}

const activeKey = (jti: string) => `unlock:jti:${jti}`;
const revokedKey = (jti: string) => `unlock:revoked:${jti}`;
const usesKey = (jti: string, minute: number) => `unlock:uses:${jti}:${minute}`;

/**
 * Issues and verifies the per-tool unlock JWTs.
 * - One token identity per unlock session (`jti` = session id), so re-polling the status
 *   endpoint never extends the 5-minute window: expiry is anchored to `verifiedAt`.
 * - The `jti` is tracked in Redis so a token can be revoked before it expires.
 */
export class UnlockTokenService {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly redis: Redis,
    private readonly clock: Clock,
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  /** Returns null when the unlock window (verifiedAt + 5 min) is over or the token was revoked. */
  async issue(input: {
    sessionId: string;
    toolSlug: string;
    visitorId: string;
    verifiedAt: Date;
  }): Promise<IssuedToken | null> {
    const now = this.clock.now();
    const expiresAt = new Date(input.verifiedAt.getTime() + UNLOCK_TOKEN_TTL_SECONDS * 1000);
    if (expiresAt.getTime() <= now.getTime()) return null;

    const jti = input.sessionId;
    if (await this.redis.exists(revokedKey(jti))) return null;
    // NX: re-issuing the same session keeps the original registration.
    await this.redis.set(activeKey(jti), "1", "PXAT", expiresAt.getTime(), "NX");

    const token = await new SignJWT({
      toolSlug: input.toolSlug,
      visitorId: input.visitorId,
      sessionId: input.sessionId,
    })
      .setProtectedHeader({ alg: ALG, typ: "JWT" })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setJti(jti)
      .setIssuedAt(Math.floor(now.getTime() / 1000))
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.key);
    return { token, expiresAt };
  }

  /** Verifies a token for running `toolSlug` as `visitorId`, or throws the matching HttpError. */
  async verify(
    token: string,
    expected: { toolSlug: string; visitorId: string },
  ): Promise<UnlockTokenClaims> {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, this.key, {
        algorithms: [ALG],
        issuer: ISSUER,
        audience: AUDIENCE,
        currentDate: this.clock.now(),
        requiredClaims: ["jti", "exp"],
      }));
    } catch (error) {
      if (error instanceof joseErrors.JWTExpired) {
        throw new HttpError(
          401,
          "unlock_token_expired",
          "The unlock has expired; watch another ad",
        );
      }
      throw new HttpError(401, "unlock_required", "A valid unlock token is required");
    }

    const { toolSlug, visitorId, sessionId, jti } = payload as Partial<UnlockTokenClaims> & {
      jti?: string;
    };
    if (
      typeof toolSlug !== "string" ||
      typeof visitorId !== "string" ||
      typeof sessionId !== "string" ||
      !jti
    ) {
      throw new HttpError(401, "unlock_required", "A valid unlock token is required");
    }
    if (visitorId !== expected.visitorId) {
      throw new HttpError(401, "unlock_required", "This unlock belongs to another visitor");
    }
    if (toolSlug !== expected.toolSlug) {
      throw new HttpError(403, "unlock_token_tool_mismatch", "This unlock is for a different tool");
    }
    const [active, revoked] = await Promise.all([
      this.redis.exists(activeKey(jti)),
      this.redis.exists(revokedKey(jti)),
    ]);
    if (!active || revoked) {
      throw new HttpError(
        401,
        "unlock_token_expired",
        "The unlock is no longer valid; watch another ad",
      );
    }
    return { toolSlug, visitorId, sessionId, jti };
  }

  /** Counts one tool run against the token's per-minute budget. */
  async consumeUse(jti: string, limitPerMinute: number): Promise<void> {
    const minute = Math.floor(this.clock.now().getTime() / 60_000);
    const key = usesKey(jti, minute);
    const [[, count]] = (await this.redis.multi().incr(key).expire(key, 120).exec()) as [
      [Error | null, number],
    ];
    if (count > limitPerMinute) {
      throw new HttpError(
        429,
        "rate_limited",
        "Too many runs for this unlock; try again in a minute",
      );
    }
  }

  async revoke(jti: string): Promise<void> {
    await this.redis
      .multi()
      .del(activeKey(jti))
      .set(revokedKey(jti), "1", "EX", UNLOCK_TOKEN_TTL_SECONDS * 2)
      .exec();
  }
}
