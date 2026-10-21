import type { UnlockSession } from "@anytools/db";
import type { AdVerification } from "./types.js";

/**
 * Verification by minimum elapsed time measured on the server between `unlock/start`
 * (session creation) and the status request. The client cannot shorten it.
 */
export function verifyByElapsedTime(
  session: UnlockSession,
  now: Date,
  minSeconds: number,
): AdVerification {
  if (session.status === "verified") return { verified: true, retryAfterMs: 0 };
  const remaining = session.createdAt.getTime() + minSeconds * 1000 - now.getTime();
  return remaining <= 0
    ? { verified: true, retryAfterMs: 0 }
    : { verified: false, retryAfterMs: remaining };
}
