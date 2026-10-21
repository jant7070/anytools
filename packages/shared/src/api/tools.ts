import { z } from "zod";
import { downloadableFileSchema } from "../files.js";

export const toolRunSyncResponseSchema = z.object({
  mode: z.literal("sync"),
  result: z.unknown(),
});

export const toolRunQueueResponseSchema = z.object({
  mode: z.literal("queue"),
  jobId: z.uuid(),
});

export const toolRunResponseSchema = z.discriminatedUnion("mode", [
  toolRunSyncResponseSchema,
  toolRunQueueResponseSchema,
]);
export type ToolRunResponse = z.infer<typeof toolRunResponseSchema>;

export const JOB_STATES = ["queued", "active", "completed", "failed"] as const;
export type JobState = (typeof JOB_STATES)[number];

export const jobStatusResponseSchema = z.object({
  id: z.uuid(),
  toolSlug: z.string(),
  state: z.enum(JOB_STATES),
  result: z
    .object({
      output: z.unknown(),
      files: z.array(downloadableFileSchema),
    })
    .optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
});
export type JobStatusResponse = z.infer<typeof jobStatusResponseSchema>;
