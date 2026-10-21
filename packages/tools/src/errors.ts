export type ToolErrorCode = "invalid_input" | "timeout" | "failed";

/** How each ToolError surfaces in the public API (`ApiErrorCode` + HTTP status). */
export const TOOL_ERROR_HTTP = {
  invalid_input: { status: 400, code: "validation_failed" },
  timeout: { status: 504, code: "tool_timeout" },
  failed: { status: 500, code: "tool_failed" },
} as const satisfies Record<ToolErrorCode, { status: number; code: string }>;

/** Base class for errors raised while running a tool. `message` is safe to show to users. */
export class ToolError extends Error {
  constructor(
    readonly code: ToolErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** The input (or uploaded files) did not satisfy the tool's contract. */
export class ToolInputError extends ToolError {
  constructor(message: string, details?: unknown) {
    super("invalid_input", message, details);
  }
}

export class ToolTimeoutError extends ToolError {
  constructor(timeoutMs: number) {
    super("timeout", `Tool timed out after ${timeoutMs} ms`);
  }
}

export class ToolExecutionError extends ToolError {
  constructor(message: string, details?: unknown) {
    super("failed", message, details);
  }
}
