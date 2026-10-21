import type { DownloadableFile } from "@anytools/shared";

export interface ToolRunRequest {
  input: unknown;
  /** Files for `queue` tools (sent as multipart/form-data). */
  files?: File[];
}

export interface ToolRunResult<T = unknown> {
  output: T;
  files: DownloadableFile[];
}

export type ToolRunPhase = "unlocking" | "queued" | "processing";

export interface ToolUIProps {
  /**
   * Runs the tool through the API. Opens the unlock dialog first when there is no valid unlock
   * and retries once if the server says the unlock expired. Rejects with UnlockCancelledError
   * when the user closes the dialog.
   */
  run<T = unknown>(
    request: ToolRunRequest,
    onPhase?: (phase: ToolRunPhase) => void,
  ): Promise<ToolRunResult<T>>;
}

export class UnlockCancelledError extends Error {
  constructor() {
    super("Unlock cancelled");
    this.name = "UnlockCancelledError";
  }
}
