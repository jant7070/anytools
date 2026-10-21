import {
  decodeJobError,
  type DownloadableFile,
  jobStatusResponseSchema,
  type JobStatusResponse,
} from "@anytools/shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { notFound } from "../lib/http-error.js";

export const jobRoutes: FastifyPluginAsyncZod = async (app) => {
  const { toolQueue, storage, clock } = app.deps;

  /** Status of a queued tool run. Only the visitor who started the job can read it. */
  app.get(
    "/jobs/:id",
    { schema: { params: z.object({ id: z.uuid() }), response: { 200: jobStatusResponseSchema } } },
    async (request): Promise<JobStatusResponse> => {
      const job = await toolQueue.getJob(request.params.id);
      if (!job || job.data.visitorId !== request.actor.visitorId) throw notFound("Job not found");

      const base = { id: request.params.id, toolSlug: job.data.toolSlug };
      const state = await job.getState();

      if (state === "completed" && job.returnvalue) {
        const now = clock.now().getTime();
        const files = await Promise.all(
          job.returnvalue.files
            .filter((f) => new Date(f.expiresAt).getTime() > now)
            .map(async ({ key, ...file }): Promise<DownloadableFile> => ({
              ...file,
              url: await storage.getDownloadUrl(key, {
                filename: file.filename,
                expiresAt: new Date(file.expiresAt),
              }),
            })),
        );
        return { ...base, state: "completed", result: { output: job.returnvalue.output, files } };
      }
      if (state === "failed")
        return { ...base, state: "failed", error: decodeJobError(job.failedReason) };
      if (state === "active") return { ...base, state: "active" };
      return { ...base, state: "queued" };
    },
  );
};
