import { contentDisposition, LocalStorageProvider } from "@anytools/tools/storage";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { notFound } from "../lib/http-error.js";

/**
 * Serves result files for the local storage driver (development / single host). With S3/R2 the
 * browser downloads straight from the bucket through presigned URLs and this route is not mounted.
 */
export const fileRoutes: FastifyPluginAsyncZod = async (app) => {
  const { storage, clock } = app.deps;
  if (!(storage instanceof LocalStorageProvider)) return;

  app.get(
    "/files/results/:id",
    {
      schema: {
        params: z.object({ id: z.uuid() }),
        querystring: z.object({ exp: z.coerce.number().int(), sig: z.string().max(128) }),
      },
    },
    async (request, reply) => {
      const key = `results/${request.params.id}`;
      const { exp, sig } = request.query;
      if (!storage.verifyDownloadSignature(key, exp, sig, clock.now()))
        throw notFound("File not found or expired");
      const file = await storage.get(key);
      if (!file) throw notFound("File not found or expired");
      return reply
        .header("content-type", file.contentType)
        .header("content-disposition", contentDisposition(file.filename))
        .header("cache-control", "private, no-store")
        .send(file.data);
    },
  );
};
