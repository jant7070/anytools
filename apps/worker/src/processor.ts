import {
  encodeJobError,
  RESULT_FILE_TTL_SECONDS,
  type StoredFileRef,
  type ToolJobData,
  type ToolJobResult,
} from "@anytools/shared";
import {
  executeTool,
  TOOL_ERROR_HTTP,
  ToolError,
  type ToolInputFile,
  type ToolRegistry,
} from "@anytools/tools";
import { createFileKey, type StorageProvider } from "@anytools/tools/storage";
import { type Job, UnrecoverableError } from "bullmq";
import type { Logger } from "pino";

export interface ProcessorDeps {
  registry: ToolRegistry;
  storage: StorageProvider;
  logger: Logger;
  now?: () => Date;
}

/** Tool failures are final (no retries) and carry a user-safe, JSON-encoded error. */
function fail(code: string, message: string): never {
  throw new UnrecoverableError(encodeJobError({ code, message }));
}

/**
 * Executes one `queue` tool job: loads the uploaded inputs from storage, runs the tool through
 * the shared executor (validation + timeout) and persists result files with a 30-minute expiry.
 */
export function createToolProcessor(deps: ProcessorDeps) {
  const now = deps.now ?? (() => new Date());

  return async function processToolJob(
    job: Job<ToolJobData, ToolJobResult>,
  ): Promise<ToolJobResult> {
    const { toolSlug, input } = job.data;
    const log = deps.logger.child({ jobId: job.id, tool: toolSlug });
    const tool = deps.registry.get(toolSlug);
    if (!tool || tool.runMode !== "queue") fail("tool_failed", "Unknown tool");

    try {
      const files: ToolInputFile[] = [];
      for (const ref of job.data.files) {
        const stored = await deps.storage.get(ref.key);
        if (!stored)
          fail("validation_failed", "The uploaded file has expired, please upload it again");
        files.push({
          filename: ref.filename,
          contentType: ref.contentType,
          size: stored.data.length,
          data: stored.data,
        });
      }

      const saved: StoredFileRef[] = [];
      const started = Date.now();
      const output = await executeTool(tool, input, {
        files,
        log,
        saveFile: async (file) => {
          const key = createFileKey("results");
          const expiresAt = new Date(now().getTime() + RESULT_FILE_TTL_SECONDS * 1000);
          await deps.storage.put({ key, ...file, expiresAt });
          const ref: StoredFileRef = {
            key,
            filename: file.filename,
            contentType: file.contentType,
            size: file.data.length,
            expiresAt: expiresAt.toISOString(),
          };
          saved.push(ref);
          return ref;
        },
      });
      log.info({ durationMs: Date.now() - started, files: saved.length }, "tool job completed");
      return { output, files: saved };
    } catch (error) {
      if (error instanceof ToolError) fail(TOOL_ERROR_HTTP[error.code].code, error.message);
      throw error;
    } finally {
      // Inputs are no longer needed once processed (success or not).
      await Promise.allSettled(job.data.files.map((f) => deps.storage.delete(f.key)));
    }
  };
}
