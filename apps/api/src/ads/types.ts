import type { UnlockSession } from "@anytools/db";
import type { AdClientConfig, AdProviderName } from "@anytools/shared";

export interface AdVerification {
  verified: boolean;
  /** Suggested delay before the client polls again when not verified yet. */
  retryAfterMs: number;
}

/**
 * Server-side ad provider. The browser only renders the ad; this object alone decides whether
 * an unlock session counts as watched.
 */
export interface AdProvider {
  readonly name: AdProviderName;
  /** Browser-safe config needed to render the ad. Must never contain secrets. */
  clientConfig(session: UnlockSession): AdClientConfig;
  /** Whether the session's ad is verified at `now`. Pure: persisting the result is the caller's job. */
  checkVerification(session: UnlockSession, now: Date): AdVerification;
}
