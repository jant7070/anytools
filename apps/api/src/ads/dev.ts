import { verifyByElapsedTime } from "./time-based.js";
import type { AdProvider } from "./types.js";

/** Fake ad for local development: a countdown, verified server-side after `seconds`. */
export function createDevAdProvider(seconds: number): AdProvider {
  return {
    name: "dev",
    clientConfig: () => ({ provider: "dev", countdownSeconds: seconds }),
    checkVerification: (session, now) => verifyByElapsedTime(session, now, seconds),
  };
}
