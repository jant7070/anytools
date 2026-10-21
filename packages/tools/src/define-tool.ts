import { SLUG_PATTERN, type StoredFileRef } from "@anytools/shared";
import type { z } from "zod";

export interface ToolLimits {
  /** Max size of the JSON body (sync tools) or of each uploaded file (queue tools). */
  maxInputBytes: number;
  /** Hard limit for the handler; it receives an aborted `ctx.signal` when exceeded. */
  timeoutMs: number;
}

export interface ToolFileSpec {
  /** Accepted MIME types, e.g. `["image/png", "image/jpeg"]`. */
  accept: readonly string[];
  minFiles: number;
  maxFiles: number;
}

export interface ToolInputFile {
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
}

export interface SaveFileInput {
  data: Buffer;
  filename: string;
  contentType: string;
}

export interface ToolLogger {
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}

export interface ToolContext {
  /** Aborted when the tool times out or the caller cancels. Check it between expensive steps. */
  signal: AbortSignal;
  /** Uploaded files (queue tools only; empty for sync tools). */
  files: readonly ToolInputFile[];
  /** Persists a result file; it expires automatically (see RESULT_FILE_TTL_SECONDS). */
  saveFile(file: SaveFileInput): Promise<StoredFileRef>;
  log: ToolLogger;
}

interface BaseToolDefinition<I extends z.ZodType, O extends z.ZodType> {
  slug: string;
  input: I;
  output: O;
  limits: ToolLimits;
  // Method syntax keeps handler parameters bivariant so concrete tools fit AnyToolDefinition.
  handler(input: z.output<I>, ctx: ToolContext): Promise<z.input<O>>;
}

/** Runs inline in the API request. JSON input only. */
export interface SyncToolDefinition<
  I extends z.ZodType,
  O extends z.ZodType,
> extends BaseToolDefinition<I, O> {
  runMode: "sync";
  files?: undefined;
}

/** Enqueued and executed by the worker. May accept uploaded files. */
export interface QueueToolDefinition<
  I extends z.ZodType,
  O extends z.ZodType,
> extends BaseToolDefinition<I, O> {
  runMode: "queue";
  files?: ToolFileSpec;
}

export type ToolDefinition<I extends z.ZodType = z.ZodType, O extends z.ZodType = z.ZodType> =
  SyncToolDefinition<I, O> | QueueToolDefinition<I, O>;

export type AnyToolDefinition = ToolDefinition<z.ZodType, z.ZodType>;

export function defineTool<I extends z.ZodType, O extends z.ZodType>(
  definition: ToolDefinition<I, O>,
): ToolDefinition<I, O> {
  if (!SLUG_PATTERN.test(definition.slug)) {
    throw new Error(`Invalid tool slug "${definition.slug}" (use kebab-case)`);
  }
  if (definition.limits.maxInputBytes <= 0 || definition.limits.timeoutMs <= 0) {
    throw new Error(`Tool "${definition.slug}" must declare positive limits`);
  }
  if (definition.runMode === "queue" && definition.files) {
    const { minFiles, maxFiles } = definition.files;
    if (minFiles < 0 || maxFiles < minFiles) {
      throw new Error(`Tool "${definition.slug}" has an invalid files spec`);
    }
  }
  return definition;
}
