import { z } from "zod";
import { AD_PROVIDERS } from "../constants.js";
import { localeSchema, slugSchema } from "./catalog.js";

export const TOOL_CLICK_SECTIONS = [
  "featured",
  "popular",
  "category",
  "audience",
  "new",
  "search",
  "related",
] as const;
export type ToolClickSection = (typeof TOOL_CLICK_SECTIONS)[number];

const adProvider = z.enum(AD_PROVIDERS);
const shortText = z.string().max(120);

export const analyticsEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("page_view"),
    props: z.object({ path: z.string().max(300), locale: localeSchema }),
  }),
  z.object({ type: z.literal("tool_view"), toolSlug: slugSchema }),
  z.object({
    type: z.literal("tool_click"),
    toolSlug: slugSchema,
    props: z.object({ section: z.enum(TOOL_CLICK_SECTIONS) }),
  }),
  z.object({
    type: z.literal("ad_requested"),
    toolSlug: slugSchema,
    props: z.object({ provider: adProvider }),
  }),
  z.object({
    type: z.literal("ad_completed"),
    toolSlug: slugSchema,
    props: z.object({ provider: adProvider }),
  }),
  z.object({
    type: z.literal("ad_failed"),
    toolSlug: slugSchema,
    props: z.object({ provider: adProvider, reason: shortText }),
  }),
  z.object({ type: z.literal("tool_unlocked"), toolSlug: slugSchema }),
  z.object({
    type: z.literal("tool_used"),
    toolSlug: slugSchema,
    props: z.object({ durationMs: z.number().int().nonnegative().max(3_600_000) }).optional(),
  }),
  z.object({
    type: z.literal("tool_error"),
    toolSlug: slugSchema,
    props: z.object({ code: shortText }),
  }),
  z.object({
    type: z.literal("search"),
    props: z.object({ query: z.string().max(100), results: z.number().int().nonnegative() }),
  }),
]);
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
export type AnalyticsEventType = AnalyticsEvent["type"];

export const MAX_EVENTS_PER_BATCH = 50;

export const eventsBatchRequestSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(MAX_EVENTS_PER_BATCH),
});
export type EventsBatchRequest = z.infer<typeof eventsBatchRequestSchema>;

export const eventsBatchResponseSchema = z.object({ accepted: z.number().int() });
