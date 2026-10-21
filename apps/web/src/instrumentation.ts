/** Runs once when the Next.js server starts: fail fast with a clear message on a bad environment. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build")
    return;
  const { getEnv } = await import("./lib/env");
  getEnv();
}
