import { refineStorageEnv, storageEnvShape } from "@anytools/tools/storage";
import { z } from "zod";

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    DATABASE_URL: z.url(),
    DATABASE_POOL_MAX: positiveInt(3),
    REDIS_URL: z.url(),
    WORKER_CONCURRENCY: positiveInt(2),
    CLEANUP_EVERY_SECONDS: positiveInt(300),
    WORKER_HEALTH_PORT: positiveInt(4100),
    ...storageEnvShape,
  })
  .superRefine((env, ctx) => refineStorageEnv(env, ctx));

export type Env = z.output<typeof envSchema>;

export class EnvError extends Error {}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`,
    );
    throw new EnvError(
      `Invalid environment for @anytools/worker:\n${lines.join("\n")}\nSee apps/worker/.env.example.`,
    );
  }
  return result.data;
}
