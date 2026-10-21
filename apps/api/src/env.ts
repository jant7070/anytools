import { refineStorageEnv, storageEnvShape } from "@anytools/tools/storage";
import { z } from "zod";

const bool = (fallback: boolean) => z.stringbool().default(fallback);
const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("0.0.0.0"),
    PORT: positiveInt(4000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),

    DATABASE_URL: z.url(),
    DATABASE_POOL_MAX: positiveInt(10),
    REDIS_URL: z.url(),

    /** Signs the anonymous visitor cookie. */
    COOKIE_SECRET: z.string().min(32),
    /** Defaults to true in production. Browsers accept Secure cookies on http://localhost. */
    COOKIE_SECURE: z.stringbool().optional(),
    /** Signs the 5-minute unlock JWTs. */
    UNLOCK_JWT_SECRET: z.string().min(32),
    /** Salt for the one-way IP hash stored with unlock sessions. */
    IP_HASH_SALT: z.string().min(16),

    /**
     * Which X-Forwarded-* hops to trust: `false`, a hop count (e.g. `1` behind Traefik/Caddy),
     * or a comma-separated list of proxy IPs/CIDRs. Avoid `true` (trusts any spoofed header).
     */
    TRUST_PROXY: z
      .string()
      .default("false")
      .transform((v): boolean | number | string[] => {
        const value = v.trim();
        if (value === "false" || value === "") return false;
        if (value === "true") return true;
        if (/^\d+$/.test(value)) return Number(value);
        return value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }),
    /** Read the client IP/country from Cloudflare headers. Only enable behind Cloudflare. */
    TRUST_CLOUDFLARE_HEADERS: bool(false),
    /** Expose `draft` tools in the catalog. Defaults to true in development. */
    SHOW_DRAFT_TOOLS: z.stringbool().optional(),

    TURNSTILE_SECRET_KEY: z.string().min(1),

    AD_PROVIDER: z.enum(["dev", "monetag", "applixir"]).default("dev"),
    /** The fake `dev` provider refuses to start in production unless explicitly allowed. */
    ALLOW_DEV_AD_PROVIDER: bool(false),
    DEV_AD_SECONDS: positiveInt(5),
    MONETAG_ZONE_ID: z.string().min(1).optional(),
    MONETAG_SDK_URL: z.url().optional(),
    MONETAG_MIN_SECONDS: positiveInt(20),
    APPLIXIR_API_KEY: z.string().min(1).optional(),
    APPLIXIR_GAME_ID: z.string().min(1).optional(),
    APPLIXIR_SECRET: z.string().min(1).optional(),
    APPLIXIR_SDK_URL: z.url().default("https://cdn.applixir.com/applixir.app.v6.1.0.js"),

    /** Cap on unlock sessions per IP per UTC day (soft abuse limit, notably for time-based Monetag). */
    UNLOCK_MAX_PER_IP_PER_DAY: positiveInt(300),
    /** Max tool runs per unlock token per minute. */
    UNLOCK_RUNS_PER_MINUTE: positiveInt(10),
    RATE_LIMIT_GLOBAL_PER_MINUTE: positiveInt(300),
    RATE_LIMIT_UNLOCK_START_PER_MINUTE: positiveInt(10),
    RATE_LIMIT_RUN_PER_MINUTE: positiveInt(30),
    RATE_LIMIT_EVENTS_PER_MINUTE: positiveInt(60),

    ...storageEnvShape,
  })
  .superRefine((env, ctx) => {
    refineStorageEnv(env, ctx);
    if (env.AD_PROVIDER === "dev" && env.NODE_ENV === "production" && !env.ALLOW_DEV_AD_PROVIDER) {
      ctx.addIssue({
        code: "custom",
        path: ["AD_PROVIDER"],
        message:
          "the fake `dev` ad provider cannot run in production (set ALLOW_DEV_AD_PROVIDER=true only for local testing)",
      });
    }
    if (env.AD_PROVIDER === "monetag") {
      for (const key of ["MONETAG_ZONE_ID", "MONETAG_SDK_URL"] as const) {
        if (!env[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "required when AD_PROVIDER=monetag",
          });
      }
    }
    if (env.AD_PROVIDER === "applixir") {
      for (const key of ["APPLIXIR_API_KEY", "APPLIXIR_GAME_ID", "APPLIXIR_SECRET"] as const) {
        if (!env[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "required when AD_PROVIDER=applixir",
          });
      }
    }
  })
  .transform((env) => ({
    ...env,
    COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === "production",
    SHOW_DRAFT_TOOLS: env.SHOW_DRAFT_TOOLS ?? env.NODE_ENV === "development",
  }));

export type Env = z.output<typeof envSchema>;

export class EnvError extends Error {}

/** Parses and validates the environment, failing with a readable list of problems. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
    );
    throw new EnvError(
      `Invalid environment for @anytools/api:\n${lines.join("\n")}\nSee apps/api/.env.example.`,
    );
  }
  return result.data;
}
