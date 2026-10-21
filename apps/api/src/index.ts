import { buildApp } from "./app.js";
import { createDeps } from "./deps.js";
import { EnvError, loadEnv } from "./env.js";
import { createLogger } from "./logger.js";

async function main() {
  const env = loadEnv();
  const logger = createLogger(env);
  const deps = createDeps(env, logger);
  const app = await buildApp(deps, { logger });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    try {
      await app.close();
      await deps.close();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "error during shutdown");
      process.exit(1);
    }
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ host: env.HOST, port: env.PORT });
  logger.info(
    { adProvider: env.AD_PROVIDER, storage: env.STORAGE_DRIVER, showDrafts: env.SHOW_DRAFT_TOOLS },
    "api ready",
  );
}

main().catch((error: unknown) => {
  if (error instanceof EnvError) {
    console.error(error.message);
  } else {
    console.error("[api] failed to start:", error);
  }
  process.exit(1);
});
