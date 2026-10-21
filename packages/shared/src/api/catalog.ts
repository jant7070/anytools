import { z } from "zod";
import { LOCALES, SLUG_PATTERN, TOOL_RUN_MODES, TOOL_STATUSES } from "../constants.js";

export const slugSchema = z.string().min(1).max(64).regex(SLUG_PATTERN);
export const localeSchema = z.enum(LOCALES);

export const localeQuerySchema = z.object({ locale: localeSchema.default("es") });

export const categorySchema = z.object({
  slug: slugSchema,
  icon: z.string(),
  name: z.string(),
  description: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

export const audienceSchema = z.object({
  slug: slugSchema,
  name: z.string(),
  description: z.string(),
});
export type Audience = z.infer<typeof audienceSchema>;

export const toolSummarySchema = z.object({
  slug: slugSchema,
  categorySlug: slugSchema,
  runMode: z.enum(TOOL_RUN_MODES),
  status: z.enum(TOOL_STATUSES),
  featured: z.boolean(),
  name: z.string(),
  shortDescription: z.string(),
  audienceSlugs: z.array(slugSchema),
  createdAt: z.iso.datetime(),
});
export type ToolSummary = z.infer<typeof toolSummarySchema>;

export const toolDetailSchema = toolSummarySchema.extend({
  seoTitle: z.string(),
  seoDescription: z.string(),
  contentMd: z.string(),
  category: categorySchema,
  audiences: z.array(audienceSchema),
  updatedAt: z.iso.datetime(),
});
export type ToolDetail = z.infer<typeof toolDetailSchema>;

export const toolListResponseSchema = z.object({ tools: z.array(toolSummarySchema) });
export type ToolListResponse = z.infer<typeof toolListResponseSchema>;

export const homeResponseSchema = z.object({
  featured: z.array(toolSummarySchema),
  popular: z.array(toolSummarySchema),
  newest: z.array(toolSummarySchema),
  categories: z.array(categorySchema.extend({ tools: z.array(toolSummarySchema) })),
  audiences: z.array(audienceSchema.extend({ tools: z.array(toolSummarySchema) })),
});
export type HomeResponse = z.infer<typeof homeResponseSchema>;
