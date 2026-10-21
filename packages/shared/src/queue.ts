import type { StoredFileRef } from "./files.js";

/** BullMQ queue that carries `queue` tool executions from the API to the worker. */
export const TOOL_QUEUE_NAME = "tool-runs";

/** BullMQ queue for periodic maintenance (expired files, stale unlock sessions). */
export const MAINTENANCE_QUEUE_NAME = "maintenance";

export interface ToolJobInputFile {
  key: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface ToolJobData {
  toolSlug: string;
  input: unknown;
  files: ToolJobInputFile[];
  /** Owner of the job; only this visitor may read its status and results. */
  visitorId: string;
  requestedAt: string;
}

export interface ToolJobResult {
  output: unknown;
  files: StoredFileRef[];
}

export interface ToolJobError {
  code: string;
  message: string;
}

/** BullMQ only keeps a `failedReason` string, so user-safe errors travel JSON-encoded. */
export function encodeJobError(error: ToolJobError): string {
  return JSON.stringify(error);
}

export function decodeJobError(reason: string | undefined): ToolJobError {
  try {
    const parsed = JSON.parse(reason ?? "") as Partial<ToolJobError>;
    if (typeof parsed.code === "string" && typeof parsed.message === "string") {
      return { code: parsed.code, message: parsed.message };
    }
  } catch {
    // Not one of ours (e.g. a crash): fall through to a generic message.
  }
  return { code: "tool_failed", message: "The tool failed to process the request" };
}
