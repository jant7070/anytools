import type { z } from "zod";
import type { AnyToolDefinition, ToolContext, ToolInputFile } from "./define-tool.js";
import { ToolError, ToolExecutionError, ToolInputError, ToolTimeoutError } from "./errors.js";

export interface ExecuteToolOptions extends Omit<ToolContext, "signal" | "files"> {
  files?: readonly ToolInputFile[];
  /** Optional external cancellation (e.g. worker shutdown). */
  signal?: AbortSignal;
}

function formatIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

/** Throws ToolInputError when uploaded files do not match the tool's file spec. */
export function assertFilesAllowed(tool: AnyToolDefinition, files: readonly ToolInputFile[]): void {
  const spec = tool.runMode === "queue" ? tool.files : undefined;
  if (!spec) {
    if (files.length > 0) throw new ToolInputError("This tool does not accept files");
    return;
  }
  if (files.length < spec.minFiles || files.length > spec.maxFiles) {
    throw new ToolInputError(`Expected between ${spec.minFiles} and ${spec.maxFiles} file(s)`);
  }
  for (const file of files) {
    if (!spec.accept.includes(file.contentType)) {
      throw new ToolInputError(`Unsupported file type: ${file.contentType}`);
    }
    if (file.size > tool.limits.maxInputBytes) {
      throw new ToolInputError(`File exceeds ${tool.limits.maxInputBytes} bytes`);
    }
  }
}

/**
 * Validates input, runs the handler under the tool's timeout and validates the output.
 * Shared by the API (sync tools) and the worker (queue tools) so both enforce the same contract.
 */
export async function executeTool(
  tool: AnyToolDefinition,
  rawInput: unknown,
  options: ExecuteToolOptions,
): Promise<unknown> {
  const parsed = tool.input.safeParse(rawInput);
  if (!parsed.success) {
    throw new ToolInputError("Invalid tool input", formatIssues(parsed.error));
  }
  const files = options.files ?? [];
  assertFilesAllowed(tool, files);

  const controller = new AbortController();
  const timeoutMs = tool.limits.timeoutMs;
  const onExternalAbort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", onExternalAbort, { once: true });

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new ToolTimeoutError(timeoutMs);
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      tool.handler(parsed.data, {
        signal: controller.signal,
        files,
        saveFile: options.saveFile,
        log: options.log,
      }),
      timeout,
    ]);
    const output = tool.output.safeParse(result);
    if (!output.success) {
      throw new ToolExecutionError("Tool returned an invalid output", formatIssues(output.error));
    }
    return output.data;
  } catch (error) {
    if (error instanceof ToolError) throw error;
    options.log.error({ err: error, tool: tool.slug }, "tool handler failed");
    throw new ToolExecutionError("The tool failed to process the request");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
}
