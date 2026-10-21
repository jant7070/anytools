import { createHash, timingSafeEqual } from "node:crypto";
import type { AdProvider } from "./types.js";

export interface ApplixirOptions {
  apiKey: string;
  gameId: string;
  secret: string;
  sdkUrl: string;
}

/**
 * AppLixir confirms each completed ad with a server-to-server callback (see the webhook route),
 * which marks the session `verified`. Until then the session stays pending.
 */
export function createApplixirAdProvider(options: ApplixirOptions): AdProvider {
  return {
    name: "applixir",
    clientConfig: () => ({ provider: "applixir", sdkUrl: options.sdkUrl, apiKey: options.apiKey }),
    checkVerification: (session) =>
      session.status === "verified"
        ? { verified: true, retryAfterMs: 0 }
        : { verified: false, retryAfterMs: 2000 },
  };
}

export interface ApplixirCallbackParams {
  gameApiKey: string;
  gameId: string;
  userId: string;
  tid: string;
  signature: string;
}

/** `md5(gameApiKey + gameId + userId + tid + secret)` as documented for "MD5 and TID" mode. */
export function applixirSignature(
  params: Omit<ApplixirCallbackParams, "signature">,
  secret: string,
): string {
  return createHash("md5")
    .update(`${params.gameApiKey}${params.gameId}${params.userId}${params.tid}${secret}`)
    .digest("hex");
}

/** Constant-time signature check. */
export function verifyApplixirSignature(params: ApplixirCallbackParams, secret: string): boolean {
  const expected = Buffer.from(applixirSignature(params, secret), "utf8");
  const actual = Buffer.from(params.signature.toLowerCase(), "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
