import { randomUUID } from "node:crypto";
import {
  RESULT_FILE_TTL_SECONDS,
  slugSchema,
  toolRunQueueResponseSchema,
  toolRunSyncResponseSchema,
  type ToolJobInputFile,
} from "@anytools/shared";
import {
  assertFilesAllowed,
  executeTool,
  ToolInputError,
  type ToolInputFile,
} from "@anytools/tools";
import { createFileKey } from "@anytools/tools/storage";
import type { FastifyRequest } from "fastify";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { HttpError, notFound } from "../lib/http-error.js";

const MAX_JSON_BODY_BYTES = 256 * 1024;

function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  // Drop control characters and quotes (they would break Content-Disposition headers).
  const cleaned = [...base]
    .filter((char) => char.charCodeAt(0) > 0x1f && char.charCodeAt(0) !== 0x7f && char !== '"')
    .join("")
    .trim()
    .slice(0, 120);
  return cleaned || "file";
}

export const toolRoutes: FastifyPluginAsyncZod = async (app) => {
  const { env, registry, storage, toolQueue, clock } = app.deps;
  const { catalog, tokens, popularity } = app.services;

  /**
   * Unlock guard. Runs before the body is read: requires a valid, unexpired unlock JWT issued to
   * this visitor for this exact tool, and enforces the per-token runs-per-minute budget.
   */
  async function requireUnlock(request: FastifyRequest) {
    const { slug } = request.params as { slug: string };
    if (!registry.has(slug) || !(await catalog.findVisibleTool(slug)))
      throw notFound("Tool not available");

    const match = /^Bearer\s+(\S+)$/i.exec(request.headers.authorization ?? "");
    if (!match?.[1]) throw new HttpError(401, "unlock_required", "Watch an ad to unlock this tool");

    const claims = await tokens.verify(match[1], {
      toolSlug: slug,
      visitorId: request.actor.visitorId,
    });
    await tokens.consumeUse(claims.jti, env.UNLOCK_RUNS_PER_MINUTE);
  }

  app.post(
    "/tools/:slug/run",
    {
      onRequest: requireUnlock,
      bodyLimit: MAX_JSON_BODY_BYTES,
      config: { rateLimit: { max: env.RATE_LIMIT_RUN_PER_MINUTE, timeWindow: "1 minute" } },
      schema: {
        params: z.object({ slug: slugSchema }),
        response: { 200: toolRunSyncResponseSchema, 202: toolRunQueueResponseSchema },
      },
    },
    async (request, reply) => {
      const tool = registry.get(request.params.slug);
      if (!tool) throw notFound("Tool not available");

      if (tool.runMode === "sync") {
        if (request.isMultipart())
          throw new HttpError(415, "unsupported_media_type", "This tool expects JSON");
        const body = request.body ?? {};
        if (Buffer.byteLength(JSON.stringify(body)) > tool.limits.maxInputBytes) {
          throw new HttpError(413, "payload_too_large", "Input is too large");
        }
        const result = await executeTool(tool, body, {
          log: request.log,
          saveFile: () => Promise.reject(new Error("Sync tools cannot save files")),
        });
        await popularity.markEligible(tool.slug, request.actor.visitorId);
        return reply.code(200).send({ mode: "sync", result });
      }

      if (!request.isMultipart()) {
        throw new HttpError(415, "unsupported_media_type", "This tool expects multipart/form-data");
      }
      let rawInput: unknown = {};
      const files: ToolInputFile[] = [];
      const parts = request.parts({
        limits: {
          fileSize: tool.limits.maxInputBytes,
          files: tool.files?.maxFiles ?? 0,
          fields: 10,
          fieldSize: 16 * 1024,
        },
      });
      for await (const part of parts) {
        if (part.type === "file") {
          const data = await part.toBuffer();
          files.push({
            filename: safeFilename(part.filename),
            contentType: part.mimetype,
            size: data.length,
            data,
          });
        } else if (part.fieldname === "input") {
          try {
            rawInput = JSON.parse(String(part.value));
          } catch {
            throw new ToolInputError("The `input` field must be valid JSON");
          }
        }
      }

      const parsed = tool.input.safeParse(rawInput);
      if (!parsed.success) {
        throw new ToolInputError(
          "Invalid tool input",
          parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        );
      }
      assertFilesAllowed(tool, files);

      const expiresAt = new Date(clock.now().getTime() + RESULT_FILE_TTL_SECONDS * 1000);
      const stored: ToolJobInputFile[] = [];
      for (const file of files) {
        const key = createFileKey("inputs");
        await storage.put({
          key,
          data: file.data,
          contentType: file.contentType,
          filename: file.filename,
          expiresAt,
        });
        stored.push({
          key,
          filename: file.filename,
          contentType: file.contentType,
          size: file.size,
        });
      }

      const jobId = randomUUID();
      await toolQueue.add(
        tool.slug,
        {
          toolSlug: tool.slug,
          input: parsed.data,
          files: stored,
          visitorId: request.actor.visitorId,
          requestedAt: clock.now().toISOString(),
        },
        {
          jobId,
          attempts: 1,
          removeOnComplete: { age: RESULT_FILE_TTL_SECONDS },
          removeOnFail: { age: RESULT_FILE_TTL_SECONDS },
        },
      );
      await popularity.markEligible(tool.slug, request.actor.visitorId);
      return reply.code(202).send({ mode: "queue", jobId });
    },
  );
};
