import { z } from "zod";
import { slugSchema } from "./catalog.js";

export const unlockStartRequestSchema = z.object({
  toolSlug: slugSchema,
  turnstileToken: z.string().min(1).max(2048),
});
export type UnlockStartRequest = z.infer<typeof unlockStartRequestSchema>;

/**
 * Public, browser-safe configuration the active ad provider needs to render an ad.
 * Never put secrets here: this object is sent to the client.
 */
export const adClientConfigSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("dev"),
    countdownSeconds: z.number().int().positive(),
  }),
  z.object({
    provider: z.literal("monetag"),
    zoneId: z.string().min(1),
    sdkUrl: z.url(),
    minWatchSeconds: z.number().int().positive(),
  }),
  z.object({
    provider: z.literal("applixir"),
    sdkUrl: z.url(),
    apiKey: z.string().min(1),
  }),
]);
export type AdClientConfig = z.infer<typeof adClientConfigSchema>;

export const unlockStartResponseSchema = z.object({
  sessionId: z.uuid(),
  ad: adClientConfigSchema,
  pollIntervalMs: z.number().int().positive(),
  expiresAt: z.iso.datetime(),
});
export type UnlockStartResponse = z.infer<typeof unlockStartResponseSchema>;

export const unlockStatusParamsSchema = z.object({ id: z.uuid() });

export const unlockStatusResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending"), retryAfterMs: z.number().int().nonnegative() }),
  z.object({
    status: z.literal("verified"),
    token: z.string(),
    toolSlug: slugSchema,
    expiresAt: z.iso.datetime(),
    /** Relative lifetime, so clients with a skewed clock compute the expiry correctly. */
    expiresInMs: z.number().int().nonnegative(),
  }),
  z.object({ status: z.literal("expired") }),
]);
export type UnlockStatusResponse = z.infer<typeof unlockStatusResponseSchema>;
