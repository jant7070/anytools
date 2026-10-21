import { z } from "zod";

const optional = z.string().trim().min(1).optional().catch(undefined);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SITE_URL: z.url().default("http://localhost:3000"),
  API_INTERNAL_URL: z.url().default("http://localhost:4000"),
  TURNSTILE_SITE_KEY: z.string().min(1),
  POSTHOG_KEY: optional,
  POSTHOG_HOST: z.url().default("https://eu.i.posthog.com"),
  CLARITY_PROJECT_ID: optional,
});

export type WebEnv = z.output<typeof envSchema>;

let cached: WebEnv | undefined;

/** Server-only: validated runtime environment (read at request time, not inlined at build). */
export function getEnv(): WebEnv {
  if (cached) return cached;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(
      `Invalid environment for @anytools/web:\n${lines.join("\n")}\nSee apps/web/.env.example.`,
    );
  }
  cached = result.data;
  return cached;
}

/** Browser-safe settings, passed from the server layout to client components. */
export interface PublicConfig {
  turnstileSiteKey: string;
  posthog: { key: string; host: string } | null;
  clarityProjectId: string | null;
}

export function getPublicConfig(): PublicConfig {
  const env = getEnv();
  return {
    turnstileSiteKey: env.TURNSTILE_SITE_KEY,
    posthog: env.POSTHOG_KEY ? { key: env.POSTHOG_KEY, host: env.POSTHOG_HOST } : null,
    clarityProjectId: env.CLARITY_PROJECT_ID ?? null,
  };
}

export function siteUrl(path = ""): string {
  return `${getEnv().SITE_URL.replace(/\/$/, "")}${path}`;
}
