import { verifyByElapsedTime } from "./time-based.js";
import type { AdProvider } from "./types.js";

export interface MonetagOptions {
  zoneId: string;
  sdkUrl: string;
  minSeconds: number;
}

/**
 * Monetag does not confirm views to the server on regular websites, so the unlock is granted
 * only after a minimum time (measured server-side) since the session started.
 */
export function createMonetagAdProvider(options: MonetagOptions): AdProvider {
  return {
    name: "monetag",
    clientConfig: () => ({
      provider: "monetag",
      zoneId: options.zoneId,
      sdkUrl: options.sdkUrl,
      minWatchSeconds: options.minSeconds,
    }),
    checkVerification: (session, now) => verifyByElapsedTime(session, now, options.minSeconds),
  };
}
